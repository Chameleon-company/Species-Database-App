"""
Merge-readiness tests for the backend branch.
=============================================
Author: Byron Ehrhardt (s224341683) - Backend Lead

These tests cover the things that had to be true before the backend branch
could be handed to the Project Leader for merge into master:

  1. the merged app builds and every route registers with no collision
  2. master's admin auth surface survived the merge
  3. the admin-only endpoints kept their auth guard
  4. the two security fixes found during merge review actually hold

They are deliberately offline. Supabase is stubbed, so nothing here touches
the shared project - see backend/migrations/README.md for why that matters.

Run:  python -m unittest discover -s backend/tests -v
"""

import os
import sys
import types
import unittest

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


# --------------------------------------------------------------------------
# stub everything that would otherwise need a network or real credentials
# --------------------------------------------------------------------------
def _install_stubs():
    os.environ.setdefault("SUPABASE_URL", "http://stub.invalid")
    os.environ.setdefault("SUPABASE_KEY", "stub-key")
    os.environ.setdefault("GOOGLE_CLIENT_ID", "stub-client-id")

    # stop dotenv reading the real .env, which holds a live service_role key
    dotenv_stub = types.ModuleType("dotenv")
    dotenv_stub.load_dotenv = lambda *a, **k: False
    sys.modules["dotenv"] = dotenv_stub

    class _Q:
        def __getattr__(self, _):
            return lambda *a, **k: self

        def execute(self):
            return types.SimpleNamespace(data=[])

    class _Client:
        def table(self, *_a, **_k):
            return _Q()

        @property
        def storage(self):
            return _Q()

        @property
        def auth(self):
            return _Q()

    supa = types.ModuleType("supabase")
    supa.create_client = lambda *a, **k: _Client()
    supa.Client = _Client
    sys.modules["supabase"] = supa

    # googletrans is a real dependency but heavy and network-bound; these
    # tests never translate, so stub it if it is not installed.
    try:
        import googletrans  # noqa: F401
    except ImportError:
        gt = types.ModuleType("googletrans")

        class _Translator:
            def translate(self, *_a, **_k):
                raise NotImplementedError("stubbed in tests")

        gt.Translator = _Translator
        sys.modules["googletrans"] = gt


_install_stubs()

import app as app_module  # noqa: E402
import media as media_module  # noqa: E402

FLASK_APP = app_module.app


def _rules():
    return {
        (str(r.rule), m)
        for r in FLASK_APP.url_map.iter_rules()
        if r.endpoint != "static"
        for m in (r.methods - {"HEAD", "OPTIONS"})
    }


class TestMergeIntegrity(unittest.TestCase):
    """the merge must add the backend features without dropping master's."""

    def test_app_builds(self):
        self.assertIsNotNone(FLASK_APP)

    def test_no_duplicate_endpoint_names(self):
        names = [
            r.endpoint for r in FLASK_APP.url_map.iter_rules()
            if r.endpoint != "static"
        ]
        self.assertEqual(
            len(names), len(set(names)),
            "duplicate endpoint name - Flask would refuse to start",
        )

    def test_master_auth_routes_survived(self):
        """
        these five come from master's auth build-out. the backend branch
        predates all of them, so their absence is the regression to watch for.
        """
        required = [
            ("/api/auth/admin-login", "POST"),
            ("/api/auth/admin-logout", "POST"),
            ("/api/auth/admin-refresh", "POST"),
            ("/api/auth/google-admin", "POST"),
            ("/api/admin/session-audit", "GET"),
        ]
        rules = _rules()
        for rule, method in required:
            self.assertIn(
                (rule, method), rules,
                f"master auth route {method} {rule} lost in merge",
            )

    def test_backend_features_present(self):
        """the six endpoints this branch exists to deliver."""
        required = [
            ("/api/species/<int:species_id>/videos", "POST"),
            ("/api/species/<int:species_id>/videos", "GET"),
            ("/api/media/videos/<int:media_id>", "PUT"),
            ("/api/media/videos/<int:media_id>", "DELETE"),
            ("/api/species/search", "GET"),
            ("/health", "GET"),
        ]
        rules = _rules()
        for rule, method in required:
            self.assertIn(
                (rule, method), rules, f"backend feature {method} {rule} missing"
            )


class TestUploadSpeciesAuthGuard(unittest.TestCase):
    """
    PR #203 restored the admin guard on /upload-species after it was left
    commented out. master still carries the commented-out version, so this
    test is what stops it being re-disabled.
    """

    def test_guard_is_active_not_commented(self):
        import inspect

        src = inspect.getsource(app_module.upload_species_file)
        active = [
            ln for ln in src.splitlines()
            if "get_admin_user" in ln and not ln.strip().startswith("#")
        ]
        self.assertTrue(
            active,
            "/upload-species has no ACTIVE get_admin_user call - "
            "an unauthenticated admin upload endpoint",
        )


class TestSearchFilterInjection(unittest.TestCase):
    """
    /api/species/search interpolates the query into a PostgREST filter, where
    ',' and '.' are control characters. unescaped, a caller can append their
    own OR terms and dump the table. the endpoint is unauthenticated.
    """

    def setUp(self):
        self.escape = app_module._escape_postgrest_value

    def test_value_is_quoted(self):
        out = self.escape("acacia")
        self.assertTrue(out.startswith('"') and out.endswith('"'))

    def test_comma_cannot_open_a_new_filter_term(self):
        payload = "x,species_id.gte.0"
        out = self.escape(f"*{payload}*")
        # the comma must sit inside the quoted literal, not between terms
        self.assertTrue(out.startswith('"'))
        self.assertTrue(out.endswith('"'))
        self.assertNotIn('",', out)

    def test_embedded_quote_cannot_close_quoting_early(self):
        out = self.escape('*a"b*')
        self.assertIn('\\"', out)
        self.assertEqual(out.count('"'), 3)  # 2 delimiters + 1 escaped

    def test_backslash_escaped_before_quote(self):
        out = self.escape("*a\\b*")
        self.assertIn("\\\\", out)

    def test_limits_are_defined(self):
        self.assertLessEqual(app_module.SEARCH_RESULT_LIMIT, 200)
        self.assertLessEqual(app_module.SEARCH_MAX_QUERY_LEN, 500)

    def test_empty_query_rejected(self):
        with FLASK_APP.test_client() as c:
            self.assertEqual(c.get("/api/species/search?q=").status_code, 400)
            self.assertEqual(c.get("/api/species/search").status_code, 400)

    def test_overlong_query_rejected(self):
        long_q = "a" * (app_module.SEARCH_MAX_QUERY_LEN + 1)
        with FLASK_APP.test_client() as c:
            self.assertEqual(
                c.get(f"/api/species/search?q={long_q}").status_code, 400
            )


class TestMediaUrlSSRF(unittest.TestCase):
    """
    validate_media_url fetches a caller-supplied URL from the server, so it
    must not be usable to reach hosts the caller cannot reach directly.
    """

    def setUp(self):
        self.is_public = media_module._is_public_host

    def test_cloud_metadata_address_refused(self):
        # AWS/GCP/Azure instance metadata - hands out credentials
        self.assertFalse(self.is_public("169.254.169.254"))

    def test_loopback_refused(self):
        for host in ("127.0.0.1", "localhost"):
            self.assertFalse(self.is_public(host), host)

    def test_private_ranges_refused(self):
        for host in ("10.0.0.1", "192.168.1.1", "172.16.0.1"):
            self.assertFalse(self.is_public(host), host)

    def test_unresolvable_host_refused(self):
        self.assertFalse(self.is_public("this-host-does-not-exist.invalid"))

    def test_empty_host_refused(self):
        self.assertFalse(self.is_public(""))
        self.assertFalse(self.is_public(None))

    def test_public_address_allowed(self):
        self.assertTrue(self.is_public("8.8.8.8"))

    def test_only_web_schemes_allowed(self):
        self.assertEqual(
            tuple(media_module.ALLOWED_URL_SCHEMES), ("http", "https")
        )


class TestHealthEndpoint(unittest.TestCase):
    def test_health_does_not_leak_exception_text(self):
        """
        /health is unauthenticated. on failure it must not return the raw
        exception, which can name the host, database and driver.
        """
        import inspect

        src = inspect.getsource(app_module.health_check)
        self.assertNotIn(
            '"error": str(e)', src,
            "/health returns raw exception text to unauthenticated callers",
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
