"""
Behaviour tests for the six features on this branch.
====================================================
Author: Byron Ehrhardt (s224341683) - Backend Lead

test_merge_readiness.py proves the routes register and that the escaping
helpers behave when called directly. That leaves a gap. A route can be
registered and still write the wrong thing, and an escaping helper can be
correct while the endpoint that calls it is not.

So these tests drive the endpoints through Flask's test client against a
fake Supabase that records every write, and then assert on what was
actually written. If someone later deletes 'definition' from the insert
payload, test_merge_readiness still passes and this file does not.

Same rule as the other suite: entirely offline, no .env, nothing here can
reach the shared Supabase project.

Run:  python -m unittest discover -s backend/tests -v
"""

import datetime
import os
import sys
import types
import unittest

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


# --------------------------------------------------------------------------
# a fake Supabase that remembers what it was asked to write
# --------------------------------------------------------------------------
class _Resp:
    def __init__(self, data):
        self.data = data


class _Table:
    """Enough of the postgrest builder to satisfy the handlers."""

    def __init__(self, db, name):
        self.db = db
        self.name = name
        self._filters = {}
        self._payload = None
        self._op = None
        self._limit = None

    def insert(self, payload):
        self._op, self._payload = "insert", payload
        return self

    def update(self, payload):
        self._op, self._payload = "update", payload
        return self

    def select(self, *_a, **_k):
        self._op = "select"
        return self

    def delete(self):
        self._op = "delete"
        return self

    def eq(self, col, val):
        self._filters[col] = val
        return self

    def or_(self, *a, **_k):
        self.db.filter_calls.append(a)
        return self

    def ilike(self, *_a, **_k):
        return self

    def limit(self, n):
        self._limit = n
        return self

    def order(self, *_a, **_k):
        return self

    def single(self):
        return self

    def execute(self):
        rows = self.db.data.setdefault(self.name, [])
        if self._op == "insert":
            items = self._payload if isinstance(self._payload, list) else [self._payload]
            written = []
            for item in items:
                row = dict(item)
                row.setdefault(self.db.pk(self.name), self.db.next_id(self.name))
                rows.append(row)
                written.append(row)
            self.db.writes.append((self.name, "insert", written))
            return _Resp(written)

        matched = [r for r in rows
                   if all(r.get(c) == v for c, v in self._filters.items())]

        if self._op == "update":
            for r in matched:
                r.update(self._payload)
            self.db.writes.append((self.name, "update", dict(self._payload)))
            return _Resp(matched)

        if self._op == "delete":
            for r in matched:
                rows.remove(r)
            return _Resp(matched)

        return _Resp(matched[:self._limit] if self._limit else matched)


class FakeSupabase:
    def __init__(self):
        self.data = {}
        self.writes = []
        self.filter_calls = []
        self._seq = {}
        bucket = types.SimpleNamespace(
            upload=lambda *a, **k: None,
            remove=lambda *a, **k: None,
            get_public_url=lambda *a, **k: "https://cdn.example.org/x.jpg",
        )
        self.storage = types.SimpleNamespace(from_=lambda *a, **k: bucket)

    def pk(self, table):
        return {"media": "media_id",
                "species_en": "species_id",
                "species_tet": "species_id"}.get(table, "id")

    def next_id(self, table):
        self._seq[table] = self._seq.get(table, 0) + 1
        return self._seq[table]

    def table(self, name):
        return _Table(self, name)

    def rpc(self, *_a, **_k):
        return _Resp([])

    # helpers the tests use
    def writes_to(self, table, op):
        return [w[2] for w in self.writes if w[0] == table and w[1] == op]

    def clear(self):
        self.writes.clear()
        self.filter_calls.clear()


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


_install_stubs()

import app as app_module  # noqa: E402
import media as media_module  # noqa: E402

FLASK_APP = app_module.app
FLASK_APP.config["TESTING"] = True

_FUTURE = (datetime.datetime.now(datetime.timezone.utc)
           + datetime.timedelta(hours=1)).isoformat()
ADMIN_HEADERS = {"Authorization": "TEST-ADMIN-TOKEN"}


def _reset(with_species=True):
    """
    Full reset between tests. The fake is module-level, so without this the
    tables carry over and the tests start depending on the order they run in,
    which is a bug that hides real ones.
    """
    FAKE.data.clear()
    FAKE.writes.clear()
    FAKE.filter_calls.clear()
    FAKE._seq.clear()

    FAKE.data["admin_sessions"] = [{
        "session_id": 1, "user_id": 42, "access_token": "TEST-ADMIN-TOKEN",
        "expires_at": _FUTURE, "revoked": False, "revocation_reason": None,
        "ip_address": "1.2.3.4", "user_agent": "unittest",
    }]
    FAKE.data["users"] = [{"user_id": 42, "role": "admin", "is_active": True}]

    if with_species:
        # the video handlers read scientific_name off this row, so a bare
        # {"species_id": 1} is not enough of a species to stand in for one
        FAKE.data["species_en"] = [{
            "species_id": 1,
            "scientific_name": "Acacia test",
            "common_name": "Test wattle",
        }]
        FAKE.data["species_tet"] = [{"species_id": 1,
                                     "scientific_name": "Acacia test"}]
    FAKE.writes.clear()


def _species_payload(**over):
    fields = ["scientific_name", "common_name", "etymology", "habitat",
              "identification_character", "leaf_type", "fruit_type",
              "phenology", "seed_germination", "pest"]
    body = {f: "en-value" for f in fields}
    body.update({f + "_tetum": "tet-value" for f in fields})
    body.update(over)
    return body


class TestDefinitionField(unittest.TestCase):
    """
    The frontend was already sending definition and definition_tetum before
    the column existed, so the data was being dropped. These check it now
    reaches both language tables and survives an edit.
    """

    def setUp(self):
        _reset()

    def test_create_stores_definition_in_both_tables(self):
        self.client = FLASK_APP.test_client()
        self.client.post("/species", headers=ADMIN_HEADERS,
                         json=_species_payload(definition="EN-DEF",
                                               definition_tetum="TET-DEF"))
        en = FAKE.writes_to("species_en", "insert")
        tet = FAKE.writes_to("species_tet", "insert")
        self.assertTrue(en, "no insert into species_en")
        self.assertTrue(tet, "no insert into species_tet")
        self.assertEqual(en[0][0].get("definition"), "EN-DEF")
        self.assertEqual(tet[0][0].get("definition"), "TET-DEF")

    def test_definition_survives_an_edit(self):
        for path in ("/api/species/1/english", "/api/species/1/tetum"):
            _reset()
            FLASK_APP.test_client().put(path, headers=ADMIN_HEADERS,
                                        json={"definition": "EDITED"})
            wrote = [w for w in FAKE.writes
                     if w[1] == "update" and w[2].get("definition") == "EDITED"]
            self.assertTrue(wrote, f"{path} did not persist definition")


class TestStorageVersioning(unittest.TestCase):
    """
    storage_version is what lets an offline device tell a replaced file from
    an edited caption. It has to move when the stored file changes and stay
    put when it does not. The 'stay put' half is the one worth testing,
    because a version that bumps on every edit makes the PWA re-download
    everything and looks like it is working.
    """

    def setUp(self):
        _reset()
        self.client = FLASK_APP.test_client()
        self.client.post("/api/species/1/videos", headers=ADMIN_HEADERS,
                         json={"download_link": "https://example.org/a.mp4",
                               "streaming_link": "https://example.org/a.mp4",
                               "alt_text": "clip"})
        inserted = FAKE.writes_to("media", "insert")
        self.media_id = inserted[0][0]["media_id"] if inserted else 1
        self.first_insert = inserted

    def test_new_media_starts_at_version_one(self):
        self.assertTrue(self.first_insert, "no media row inserted")
        self.assertEqual(self.first_insert[0][0].get("storage_version"), 1)

    def test_metadata_edit_does_not_bump_version(self):
        FAKE.clear()
        self.client.put(f"/api/media/videos/{self.media_id}",
                        headers=ADMIN_HEADERS, json={"alt_text": "new caption"})
        updates = FAKE.writes_to("media", "update")
        self.assertTrue(updates, "no media update recorded")
        self.assertNotIn("storage_version", updates[0],
                         "caption-only edit bumped the version")

    def test_replacing_the_file_bumps_version(self):
        FAKE.clear()
        self.client.put(f"/api/media/videos/{self.media_id}",
                        headers=ADMIN_HEADERS,
                        json={"download_link": "https://example.org/new.mp4"})
        updates = FAKE.writes_to("media", "update")
        self.assertTrue(updates, "no media update recorded")
        self.assertEqual(updates[0].get("storage_version"), 2)

    def test_read_endpoint_exposes_version(self):
        resp = self.client.get("/api/species/1/videos")
        self.assertEqual(resp.status_code, 200)
        videos = (resp.get_json() or {}).get("videos", [])
        self.assertTrue(videos, "no videos returned")
        self.assertIn("storage_version", videos[0])


class TestAdminGuardsHold(unittest.TestCase):
    """
    The source-level check in test_merge_readiness proves the guard is not
    commented out. This proves the endpoint actually refuses the request,
    which is the thing anyone reviewing this cares about.
    """

    def setUp(self):
        _reset()

    def test_upload_species_refuses_anonymous_callers(self):
        resp = FLASK_APP.test_client().post("/upload-species")
        self.assertIn(resp.status_code, (401, 403),
                      f"unauthenticated bulk import returned {resp.status_code}")

    def test_video_write_endpoints_refuse_anonymous_callers(self):
        client = FLASK_APP.test_client()
        for method, path in (("post", "/api/species/1/videos"),
                             ("put", "/api/media/videos/1"),
                             ("delete", "/api/media/videos/1")):
            resp = getattr(client, method)(path, json={"alt_text": "x"})
            self.assertIn(resp.status_code, (401, 403),
                          f"{method.upper()} {path} returned {resp.status_code}")


class TestSearchHardeningInPractice(unittest.TestCase):
    def setUp(self):
        _reset()

    def test_injection_payload_is_quoted_before_it_reaches_the_filter(self):
        FLASK_APP.test_client().get("/api/species/search?q=x,species_id.gte.0")
        for call in FAKE.filter_calls:
            text = str(call)
            if "species_id.gte.0" in text:
                self.assertIn('"', text,
                              "injection payload reached the filter unquoted")

    def test_overlong_query_rejected(self):
        long_q = "a" * (app_module.SEARCH_MAX_QUERY_LEN + 1)
        resp = FLASK_APP.test_client().get(f"/api/species/search?q={long_q}")
        self.assertEqual(resp.status_code, 400)


class TestErrorPathsDoNotCrash(unittest.TestCase):
    """
    Both of these bit me while writing the migration. A 500 from an unguarded
    index read is a worse bug than the missing feature, because it is the one
    that pages somebody.
    """

    def setUp(self):
        _reset()
        # the handler checks the row exists before it checks the body, so an
        # empty-body test needs a real row or it just gets a 404 instead
        FAKE.data["media"] = [{
            "media_id": 1, "species_id": 1, "species_name": "Acacia test",
            "media_type": "video", "download_link": "https://example.org/a.mp4",
            "streaming_link": "https://example.org/a.mp4",
            "alt_text": "clip", "storage_version": 1,
        }]
        FAKE.writes.clear()

    def test_updating_a_missing_video_is_a_4xx_not_a_500(self):
        resp = FLASK_APP.test_client().put("/api/media/videos/999999",
                                           headers=ADMIN_HEADERS,
                                           json={"download_link": "https://e.org/z.mp4"})
        self.assertLess(resp.status_code, 500,
                        "missing media_id produced a server error")

    def test_empty_update_body_is_rejected(self):
        resp = FLASK_APP.test_client().put("/api/media/videos/1",
                                           headers=ADMIN_HEADERS, json={})
        self.assertEqual(resp.status_code, 400)


if __name__ == "__main__":
    unittest.main(verbosity=2)
