"""
Sign-in, rate limit and sync contract tests.
============================================

The field app depends on two endpoints above all: POST /api/auth/login
(first sign-in) and GET /api/bundle (first offline sync). login.js shows the
login `error` text to the user, and sync.js checks the bundle's keys, so
these tests pin both contracts, plus the hardening around them:

- every failed password check answers the same 401 "invalid credentials"
- "account disabled" / "not an admin" only after a correct password
- failed attempts are limited per name and per client IP (429); the per-IP
  block is only on once TRUSTED_PROXY_HOPS is set explicitly (except on
  admin-refresh), so an unconfirmed proxy chain cannot lock everyone out
- the client IP comes from X-Forwarded-For via ProxyFix
- unexpected errors answer a generic 500, never the exception text
- request bodies over MAX_CONTENT_LENGTH get a JSON 413
- /api/species/changes sends a device that is ahead of the server back to
  the full bundle

Entirely offline: Supabase and Google are stubbed, no .env is read.
"""

import datetime
import os
import sys
import types
import unittest
from unittest import mock

import bcrypt

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


class _Resp:
    def __init__(self, data):
        self.data = data


class _Table:
    """The postgrest builder calls these handlers use, with real ordering."""

    def __init__(self, db, name):
        self.db = db
        self.name = name
        self._op = None
        self._payload = None
        self._filters = []
        self._orders = []
        self._limit = None
        self._columns = None

    def select(self, columns="*", *_a, **_k):
        self._op = "select"
        names = [c.strip() for c in columns.split(",")]
        self._columns = None if "*" in names else names
        return self

    def insert(self, payload):
        self._op, self._payload = "insert", payload
        return self

    def update(self, payload):
        self._op, self._payload = "update", payload
        return self

    def eq(self, col, val):
        self._filters.append(lambda r: r.get(col) == val)
        return self

    def gt(self, col, val):
        self._filters.append(lambda r: r.get(col) is not None and r[col] > val)
        return self

    def in_(self, col, vals):
        self._filters.append(lambda r: r.get(col) in vals)
        return self

    def order(self, col, desc=False):
        self._orders.append((col, desc))
        return self

    def limit(self, n):
        self._limit = n
        return self

    def execute(self):
        if self.name in self.db.fail_tables:
            raise RuntimeError("connection to db.internal-host.example:5432 failed for user postgres")

        rows = self.db.data.setdefault(self.name, [])

        if self._op == "insert":
            row = dict(self._payload)
            row.setdefault("session_id", len(rows) + 1)
            rows.append(row)
            return _Resp([row])

        matched = [r for r in rows if all(f(r) for f in self._filters)]

        if self._op == "update":
            for r in matched:
                r.update(self._payload)
            return _Resp(matched)

        for col, desc in reversed(self._orders):
            matched = sorted(matched, key=lambda r: r.get(col), reverse=desc)
        if self._limit is not None:
            matched = matched[:self._limit]
        if self._columns:
            matched = [{c: r.get(c) for c in self._columns} for r in matched]
        return _Resp(matched)


class FakeSupabase:
    def __init__(self):
        self.data = {}
        self.fail_tables = set()
        self.storage = types.SimpleNamespace(
            from_=lambda *a, **k: types.SimpleNamespace()
        )

    def table(self, name):
        return _Table(self, name)

    def rpc(self, *_a, **_k):
        return _Resp([])


FAKE = FakeSupabase()


def _install_stubs():
    os.environ.setdefault("SUPABASE_URL", "http://stub.invalid")
    os.environ.setdefault("SUPABASE_KEY", "stub-key")
    os.environ.setdefault("GOOGLE_CLIENT_ID", "stub-client-id")

    dotenv_stub = types.ModuleType("dotenv")
    dotenv_stub.load_dotenv = lambda *a, **k: False
    dotenv_stub.find_dotenv = lambda *a, **k: ""
    sys.modules["dotenv"] = dotenv_stub

    supa = types.ModuleType("supabase")
    supa.create_client = lambda *a, **k: FAKE
    supa.Client = FakeSupabase
    sys.modules["supabase"] = supa

    try:
        import googletrans  # noqa: F401
    except ImportError:
        gt = types.ModuleType("googletrans")

        class _Translator:
            def translate(self, *_a, **_k):
                raise NotImplementedError("stubbed in tests")

        gt.Translator = _Translator
        sys.modules["googletrans"] = gt

    # same reason as the other suites: rebuild `app` against THIS fake
    for name, module in list(sys.modules.items()):
        path = getattr(module, "__file__", None)
        if path and os.path.dirname(os.path.abspath(path)) == BACKEND_DIR:
            del sys.modules[name]


_install_stubs()

import app as app_module  # noqa: E402
import auth_authz  # noqa: E402

FLASK_APP = app_module.app
FLASK_APP.config["TESTING"] = True
LIMITER = FLASK_APP.extensions["auth_rate_limiter"]
REAL_DUMMY_HASH = auth_authz._DUMMY_PASSWORD_HASH

# cost 4 keeps the suite fast; checkpw reads the cost from the hash itself
_FAST = bcrypt.gensalt(rounds=4)
PASSWORD = "correct horse battery"
PASSWORD_HASH = bcrypt.hashpw(PASSWORD.encode(), _FAST).decode()
FAST_DUMMY_HASH = bcrypt.hashpw(b"nobody knows this", _FAST)

_FUTURE = (datetime.datetime.now(datetime.timezone.utc)
           + datetime.timedelta(hours=1)).isoformat()

INVALID = {"error": "invalid credentials"}


def _reset():
    FAKE.data.clear()
    FAKE.fail_tables.clear()
    FAKE.data["users"] = [
        {"user_id": 1, "name": "field.worker", "password_hash": PASSWORD_HASH,
         "role": "user", "is_active": True},
        {"user_id": 2, "name": "disabled.worker", "password_hash": PASSWORD_HASH,
         "role": "user", "is_active": False},
        {"user_id": 3, "name": "google.admin@example.org", "password_hash": None,
         "role": "admin", "is_active": True},
        {"user_id": 4, "name": "site.admin", "password_hash": PASSWORD_HASH,
         "role": "admin", "is_active": True},
    ]
    FAKE.data["admin_sessions"] = []
    FAKE.data["admin_session_audit"] = []
    FAKE.data["analytics"] = []
    LIMITER.clear()
    LIMITER.clock = _Clock()
    # the default without TRUSTED_PROXY_HOPS in the environment
    FLASK_APP.config["SIGN_IN_IP_LIMIT"] = False


class _Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


class _Base(unittest.TestCase):
    def setUp(self):
        _reset()
        self.client = FLASK_APP.test_client()
        patcher = mock.patch.object(auth_authz, "_DUMMY_PASSWORD_HASH", FAST_DUMMY_HASH)
        patcher.start()
        self.addCleanup(patcher.stop)

    def login(self, name, password, ip="203.0.113.10", path="/api/auth/login"):
        return self.client.post(
            path,
            json={"name": name, "password": password},
            headers={"X-Forwarded-For": ip},
        )


class TestFieldLogin(_Base):

    def test_correct_password_returns_user_id_and_role(self):
        resp = self.login("field.worker", PASSWORD)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json(), {"user_id": 1, "role": "user"})

    def test_wrong_password_unknown_user_and_google_only_look_the_same(self):
        for name, password in [
            ("field.worker", "wrong"),
            ("nobody.here", PASSWORD),
            ("google.admin@example.org", PASSWORD),
        ]:
            resp = self.login(name, password)
            self.assertEqual(resp.status_code, 401, name)
            self.assertEqual(resp.get_json(), INVALID, name)

    def test_disabled_is_only_revealed_after_a_correct_password(self):
        resp = self.login("disabled.worker", "wrong")
        self.assertEqual((resp.status_code, resp.get_json()), (401, INVALID))

        resp = self.login("disabled.worker", PASSWORD)
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.get_json(), {"error": "account disabled"})

    def test_unknown_user_still_costs_a_bcrypt_check(self):
        with mock.patch.object(auth_authz.bcrypt, "checkpw", wraps=bcrypt.checkpw) as spy:
            self.login("nobody.here", PASSWORD)
            self.login("google.admin@example.org", PASSWORD)
        self.assertEqual(spy.call_count, 2)

    def test_real_dummy_hash_matches_the_default_bcrypt_cost(self):
        # an unknown name must take as long as a real (default cost) hash
        self.assertTrue(REAL_DUMMY_HASH.startswith(bcrypt.gensalt()[:7]))
        self.assertFalse(bcrypt.checkpw(PASSWORD.encode(), REAL_DUMMY_HASH))

    def test_missing_or_malformed_fields_are_400(self):
        for body in [{"name": "field.worker"}, {"password": PASSWORD},
                     {"name": "field.worker", "password": 12345},
                     {"name": ["field.worker"], "password": PASSWORD}]:
            resp = self.client.post("/api/auth/login", json=body)
            self.assertEqual(resp.status_code, 400, body)
            self.assertIn("error", resp.get_json())

        resp = self.client.post("/api/auth/login", json=["field.worker", PASSWORD])
        self.assertEqual(resp.status_code, 400)

    def test_password_over_72_bytes_is_401_not_500(self):
        resp = self.login("field.worker", "x" * 73)
        self.assertEqual((resp.status_code, resp.get_json()), (401, INVALID))


class TestLoginRateLimit(_Base):

    def test_sixth_failure_for_one_name_is_429_even_with_the_right_password(self):
        for _ in range(5):
            self.assertEqual(self.login("field.worker", "wrong").status_code, 401)

        resp = self.login("field.worker", PASSWORD)
        self.assertEqual(resp.status_code, 429)
        self.assertEqual(resp.get_json(),
                         {"error": "Too many attempts, try again in 15 minutes"})
        self.assertEqual(resp.headers["Retry-After"], "900")

    def test_name_limit_follows_the_name_across_ips_and_case(self):
        for i in range(5):
            self.login("field.worker", "wrong", ip=f"198.51.100.{i}")
        resp = self.login("Field.Worker", PASSWORD, ip="198.51.100.99")
        self.assertEqual(resp.status_code, 429)

    def test_unknown_names_are_counted_so_429_does_not_reveal_accounts(self):
        for _ in range(5):
            self.login("nobody.here", "guess")
        self.assertEqual(self.login("nobody.here", "guess").status_code, 429)

    def test_lock_lifts_when_the_window_passes(self):
        for _ in range(5):
            self.login("field.worker", "wrong")
        LIMITER.clock.now += 14 * 60
        resp = self.login("field.worker", PASSWORD)
        self.assertEqual(resp.status_code, 429)
        self.assertEqual(resp.get_json(),
                         {"error": "Too many attempts, try again in 1 minute"})

        LIMITER.clock.now += 60
        self.assertEqual(self.login("field.worker", PASSWORD).status_code, 200)

    def test_success_clears_the_name_count(self):
        for _ in range(4):
            self.login("field.worker", "wrong")
        self.assertEqual(self.login("field.worker", PASSWORD).status_code, 200)
        for _ in range(4):
            self.assertEqual(self.login("field.worker", "wrong").status_code, 401)

    def test_per_ip_limit_spans_names_and_spares_other_ips(self):
        FLASK_APP.config["SIGN_IN_IP_LIMIT"] = True
        for i in range(30):
            self.assertEqual(self.login(f"guess{i}", "x", ip="192.0.2.7").status_code, 401)
        self.assertEqual(self.login("field.worker", PASSWORD, ip="192.0.2.7").status_code, 429)
        self.assertEqual(self.login("field.worker", PASSWORD, ip="192.0.2.8").status_code, 200)

    def test_without_trusted_proxy_hops_a_full_ip_bucket_blocks_no_sign_in(self):
        # hop count unconfirmed: everyone may share one proxy address, so a
        # full IP bucket must not refuse the right password or Google sign-in
        with self.assertLogs(FLASK_APP.logger, level="WARNING") as logs:
            for i in range(30):
                self.assertEqual(self.login(f"guess{i}", "x", ip="192.0.2.7").status_code, 401)
        self.assertEqual(len(logs.output), 30)
        self.assertIn("sign-in failed: path=/api/auth/login ip=192.0.2.7 route=", logs.output[0])

        self.assertEqual(self.login("field.worker", PASSWORD, ip="192.0.2.7").status_code, 200)
        resp = self.login("site.admin", PASSWORD, ip="192.0.2.7", path="/api/auth/admin-login")
        self.assertEqual(resp.status_code, 200)
        with mock.patch.object(auth_authz.id_token, "verify_oauth2_token",
                               return_value={"email": "google.admin@example.org",
                                             "email_verified": True}):
            resp = self.client.post("/api/auth/google-admin", json={"id_token": "t"},
                                    headers={"X-Forwarded-For": "192.0.2.7"})
        self.assertEqual(resp.status_code, 200)

        # the per-name limit still applies
        for _ in range(5):
            self.login("field.worker", "wrong", ip="192.0.2.7")
        self.assertEqual(self.login("field.worker", PASSWORD, ip="192.0.2.9").status_code, 429)

    def test_ip_block_is_only_on_when_trusted_proxy_hops_is_set_to_1_or_more(self):
        hops = app_module.proxy_hops_from_env
        self.assertEqual(hops(None), (1, False))
        self.assertEqual(hops(""), (1, False))
        self.assertEqual(hops("  "), (1, False))
        self.assertEqual(hops("abc"), (1, False))
        self.assertEqual(hops("0"), (0, False))
        self.assertEqual(hops("-1"), (-1, False))
        self.assertEqual(hops("1"), (1, True))
        self.assertEqual(hops(" 2 "), (2, True))

    def test_client_ip_is_the_entry_the_proxy_added_not_one_the_client_sent(self):
        FLASK_APP.config["SIGN_IN_IP_LIMIT"] = True
        for i in range(30):
            self.login(f"guess{i}", "x", ip=f"10.9.9.{i}, 192.0.2.7")
        # a different spoofed left-hand entry does not escape the limit
        resp = self.login("field.worker", PASSWORD, ip="1.2.3.4, 192.0.2.7")
        self.assertEqual(resp.status_code, 429)

    def test_failures_log_the_forwarded_chain_to_check_the_hop_count(self):
        with self.assertLogs(FLASK_APP.logger, level="WARNING") as logs:
            self.login("field.worker", "wrong", ip="198.51.100.1, 104.16.0.1")
        self.assertIn("ip=104.16.0.1", logs.output[0])
        self.assertIn("'198.51.100.1', '104.16.0.1'", logs.output[0])

    def test_admin_login_shares_the_limit(self):
        for _ in range(5):
            self.login("site.admin", "wrong", path="/api/auth/admin-login")
        self.assertEqual(self.login("site.admin", PASSWORD).status_code, 429)


class TestAdminLogin(_Base):

    def admin_login(self, name, password, ip="203.0.113.20"):
        return self.login(name, password, ip=ip, path="/api/auth/admin-login")

    def test_failures_are_uniform_and_role_is_not_revealed_before_the_password(self):
        for name, password in [
            ("nobody.here", PASSWORD),
            ("site.admin", "wrong"),
            ("google.admin@example.org", PASSWORD),
            ("field.worker", "wrong"),   # not an admin: still just 401
        ]:
            resp = self.admin_login(name, password)
            self.assertEqual((resp.status_code, resp.get_json()), (401, INVALID), name)

    def test_failed_login_is_audited_for_a_real_account_after_the_401_is_sent(self):
        resp = self.admin_login("site.admin", "wrong", ip="10.0.0.1, 203.0.113.21")
        self.assertEqual(resp.status_code, 401)
        # nothing written while the response is answered: real names must
        # not take an extra database round-trip that unknown names skip
        self.assertEqual(FAKE.data["admin_session_audit"], [])

        resp.close()  # the WSGI server does this once the body is sent
        events = [(e["event_type"], e["user_id"], e["ip_address"])
                  for e in FAKE.data["admin_session_audit"]]
        self.assertEqual(events, [("failed_login", 4, "203.0.113.21")])

    def test_a_failing_audit_insert_does_not_change_the_answer(self):
        FAKE.fail_tables.add("admin_session_audit")
        resp = self.admin_login("site.admin", "wrong")
        self.assertEqual((resp.status_code, resp.get_json()), (401, INVALID))
        with self.assertLogs(FLASK_APP.logger, level="ERROR"):
            resp.close()

    def test_unknown_name_is_not_audited(self):
        self.admin_login("nobody.here", "wrong").close()
        self.assertEqual(FAKE.data["admin_session_audit"], [])

    def test_non_admin_with_the_right_password_is_403(self):
        resp = self.admin_login("field.worker", PASSWORD)
        self.assertEqual((resp.status_code, resp.get_json()), (403, {"error": "not an admin"}))

    def test_admin_with_the_right_password_gets_tokens_and_the_client_ip_is_recorded(self):
        resp = self.admin_login("site.admin", PASSWORD, ip="10.0.0.1, 203.0.113.77")
        self.assertEqual(resp.status_code, 200, resp.get_json())
        body = resp.get_json()
        self.assertTrue(body["access_token"])
        self.assertTrue(body["refresh_token"])
        self.assertEqual(FAKE.data["admin_sessions"][0]["ip_address"], "203.0.113.77")


class TestAdminRefreshAndGoogle(_Base):

    def test_refresh_with_bad_tokens_is_limited_per_ip(self):
        # even with TRUSTED_PROXY_HOPS unset (the default in _reset)
        self.assertFalse(FLASK_APP.config["SIGN_IN_IP_LIMIT"])
        for _ in range(30):
            resp = self.client.post("/api/auth/admin-refresh", json={"refresh_token": "nope"},
                                    headers={"X-Forwarded-For": "192.0.2.50"})
            self.assertEqual(resp.status_code, 401)
        resp = self.client.post("/api/auth/admin-refresh", json={"refresh_token": "nope"},
                                headers={"X-Forwarded-For": "192.0.2.50"})
        self.assertEqual(resp.status_code, 429)

    def test_refresh_rejects_non_string_and_overlong_tokens_without_500(self):
        resp = self.client.post("/api/auth/admin-refresh", json={"refresh_token": 5})
        self.assertEqual(resp.status_code, 400)
        FAKE.data["admin_sessions"] = [{"session_id": 1, "user_id": 4, "revoked": False,
                                        "refresh_token_hash": PASSWORD_HASH,
                                        "refresh_expires_at": _FUTURE,
                                        "ip_address": None, "user_agent": None}]
        resp = self.client.post("/api/auth/admin-refresh", json={"refresh_token": "y" * 100})
        self.assertEqual(resp.status_code, 401)

    def google(self, idinfo):
        with mock.patch.object(auth_authz.id_token, "verify_oauth2_token", return_value=idinfo) as verify:
            resp = self.client.post("/api/auth/google-admin", json={"id_token": "t"})
        return resp, verify

    def test_google_refuses_an_unverified_email(self):
        resp, _ = self.google({"email": "google.admin@example.org", "email_verified": False})
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(FAKE.data["admin_sessions"], [])

    def test_google_accepts_a_verified_admin_and_checks_the_audience(self):
        resp, verify = self.google({"email": "google.admin@example.org", "email_verified": True})
        self.assertEqual(resp.status_code, 200, resp.get_json())
        self.assertEqual(verify.call_args.args[2], os.environ["GOOGLE_CLIENT_ID"])

    def test_google_sign_in_refuses_to_run_without_a_client_id(self):
        with mock.patch.dict(os.environ, {"GOOGLE_CLIENT_ID": ""}):
            resp, verify = self.google({"email": "google.admin@example.org", "email_verified": True})
        self.assertEqual(resp.status_code, 503)
        verify.assert_not_called()


class TestBundle(_Base):

    def test_bundle_has_the_keys_sync_js_reads(self):
        FAKE.data["changelog"] = [
            {"change_id": 1, "version": 3, "entity_type": "species", "entity_id": 1, "operation": "UPDATE"},
            {"change_id": 2, "version": 7, "entity_type": "users", "entity_id": 9, "operation": "UPDATE"},
            {"change_id": 3, "version": 5, "entity_type": "media", "entity_id": 4, "operation": "INSERT"},
        ]
        FAKE.data["species_en"] = [{"species_id": 1, "scientific_name": "Tectona grandis"}]
        FAKE.data["species_tet"] = [{"species_id": 1, "scientific_name": "Tectona grandis"}]
        FAKE.data["media"] = [{"media_id": 4, "species_id": 1, "media_type": "image"}]

        resp = self.client.get("/api/bundle")
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertEqual(set(body), {"version", "species_en", "species_tet", "media"})
        self.assertEqual(body["version"], 7)
        self.assertEqual(body["species_en"], FAKE.data["species_en"])
        self.assertEqual(body["species_tet"], FAKE.data["species_tet"])
        self.assertEqual(body["media"], FAKE.data["media"])

    def test_empty_changelog_is_version_1(self):
        FAKE.data["changelog"] = []
        resp = self.client.get("/api/bundle")
        self.assertEqual(resp.get_json()["version"], 1)


class TestSyncVersionChecks(_Base):

    def setUp(self):
        super().setUp()
        FAKE.data["changelog"] = [
            {"change_id": 1, "version": 8, "entity_type": "species", "entity_id": 1, "operation": "UPDATE"},
            {"change_id": 2, "version": 10, "entity_type": "users", "entity_id": 9, "operation": "UPDATE"},
        ]

    def changes(self, since):
        return self.client.get(f"/api/species/changes?since_version={since}")

    def test_device_ahead_of_the_server_is_sent_to_the_bundle(self):
        resp = self.changes(11)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json(), {
            "up_to_date": False, "force_bundle": True,
            "latest_version": 10, "reason": "client_ahead",
        })

    def test_device_at_the_bundle_version_is_up_to_date(self):
        # 10 is a users change: the bundle reports it, so a fresh device holds 10
        self.assertTrue(self.changes(10).get_json()["up_to_date"])
        self.assertTrue(self.changes(9).get_json()["up_to_date"])

    def test_empty_changelog_matches_the_bundle_default_of_1(self):
        FAKE.data["changelog"] = []
        self.assertTrue(self.changes(0).get_json()["up_to_date"])
        self.assertTrue(self.changes(1).get_json()["up_to_date"])
        self.assertEqual(self.changes(2).get_json()["reason"], "client_ahead")

    def test_out_of_range_since_version_is_400_on_both_endpoints(self):
        for path in ("changes", "incremental"):
            for value in ("99999999999", "-5"):
                resp = self.client.get(f"/api/species/{path}?since_version={value}")
                self.assertEqual(resp.status_code, 400, (path, value))
                self.assertIn("since_version", resp.get_json()["error"])


class TestErrorsAndLimits(_Base):

    def test_unexpected_errors_do_not_leak_exception_text(self):
        FAKE.fail_tables.add("changelog")
        resp = self.client.get("/api/bundle")
        self.assertEqual(resp.status_code, 500)
        self.assertEqual(resp.get_json(), {"error": "internal server error"})
        self.assertNotIn("internal-host", resp.get_data(as_text=True))

    def test_http_errors_keep_their_status_and_json(self):
        self.assertEqual(self.client.get("/no/such/route").get_json(),
                         {"error": "endpoint not found"})

    def test_oversized_json_body_is_a_json_413(self):
        big = b'{"name": "a", "password": "' + b"x" * (11 * 1024 * 1024) + b'"}'
        resp = self.client.post("/api/auth/login", data=big,
                                content_type="application/json")
        self.assertEqual(resp.status_code, 413)
        self.assertIn("too large", resp.get_json()["error"])

    def _admin_session(self):
        FAKE.data["admin_sessions"] = [{
            "session_id": 1, "user_id": 4, "access_token": "TEST-ADMIN-TOKEN",
            "expires_at": _FUTURE, "revoked": False, "revocation_reason": None,
            "ip_address": None, "user_agent": None,
        }]
        return {"Authorization": "TEST-ADMIN-TOKEN"}

    def test_admin_video_upload_may_still_exceed_the_app_wide_limit(self):
        headers = self._admin_session()
        # 12 MB is over the 10 MB app-wide cap but under the 50 MB video cap:
        # it must reach the route's own checks (here: not a real video -> 415)
        from io import BytesIO
        resp = self.client.post(
            "/upload-media/file",
            headers=headers,
            data={"file": (BytesIO(b"\0" * (12 * 1024 * 1024)), "clip.mp4"),
                  "species_name": "Tectona grandis", "media_type": "video"},
            content_type="multipart/form-data",
        )
        self.assertEqual(resp.status_code, 415, resp.get_json())

    def test_missing_user_id_on_user_state_is_400(self):
        self.assertEqual(self.client.get("/api/auth/user-state").status_code, 400)


class TestLimiterMemoryBound(unittest.TestCase):

    def test_random_names_cannot_grow_the_table_past_max_keys(self):
        from rate_limit import FailedAttemptLimiter

        clock = _Clock()
        limiter = FailedAttemptLimiter({"name": 5}, 60, max_keys=3, clock=clock)
        limiter.record_failure(name="old")
        clock.now += 61                       # "old" has expired
        for name in ("a", "b", "c", "d"):
            limiter.record_failure(name=name)
        self.assertEqual(len(limiter._failures), 3)
        self.assertNotIn(("name", "old"), limiter._failures)
        self.assertNotIn(("name", "a"), limiter._failures)   # oldest live key went next

    def test_values_that_are_empty_or_of_unknown_kind_are_ignored(self):
        from rate_limit import FailedAttemptLimiter

        limiter = FailedAttemptLimiter({"name": 1}, 60, clock=_Clock())
        limiter.record_failure(name="", ip="192.0.2.1")
        self.assertEqual(limiter._failures, {})
        self.assertEqual(limiter.blocked_for(name="", ip="192.0.2.1"), 0)


if __name__ == "__main__":
    unittest.main()
