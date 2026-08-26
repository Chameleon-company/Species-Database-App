"""
Authentication tests for /api/users.
====================================
Author: Byron Ehrhardt (s224341683) - Backend Lead

All four methods on /api/users used to run with no authentication at all.
GET listed every user's name, role and active status, and DELETE removed
accounts, both to anyone who could reach the port.

These tests drive the routes through Flask's test client with no token, a
rubbish token, and a valid one, and assert that only the last gets through.
Run them against the code before the fix and the first two groups fail.

Entirely offline. Supabase is stubbed, no .env is read, nothing here can
reach the shared project.

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


class _Resp:
    def __init__(self, data):
        self.data = data


class _Table:
    """Just enough of the postgrest builder for these four handlers."""

    def __init__(self, db, name):
        self.db = db
        self.name = name
        self._filters = {}
        self._payload = None
        self._op = None

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

    def limit(self, *_a, **_k):
        return self

    def order(self, *_a, **_k):
        return self

    def execute(self):
        rows = self.db.data.setdefault(self.name, [])

        if self._op == "insert":
            row = dict(self._payload)
            row.setdefault("user_id", 99)
            rows.append(row)
            self.db.writes.append((self.name, "insert"))
            return _Resp([row])

        matched = [r for r in rows
                   if all(r.get(c) == v for c, v in self._filters.items())]

        if self._op == "update":
            for r in matched:
                r.update(self._payload)
            self.db.writes.append((self.name, "update"))
            return _Resp(matched)

        if self._op == "delete":
            for r in matched:
                rows.remove(r)
            self.db.writes.append((self.name, "delete"))
            return _Resp(matched)

        return _Resp(matched)


class FakeSupabase:
    def __init__(self):
        self.data = {}
        self.writes = []
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


_install_stubs()

import app as app_module  # noqa: E402

FLASK_APP = app_module.app
FLASK_APP.config["TESTING"] = True

_FUTURE = (datetime.datetime.now(datetime.timezone.utc)
           + datetime.timedelta(hours=1)).isoformat()

VALID = {"Authorization": "TEST-ADMIN-TOKEN"}
GARBAGE = {"Authorization": "not-a-real-token"}


def _reset():
    FAKE.data.clear()
    FAKE.writes.clear()
    FAKE.data["admin_sessions"] = [{
        "session_id": 1,
        "user_id": 42,
        "access_token": "TEST-ADMIN-TOKEN",
        "expires_at": _FUTURE,
        "revoked": False,
        "revocation_reason": None,
        "ip_address": "127.0.0.1",
        "user_agent": "tests",
    }]
    FAKE.data["users"] = [{
        #the admin the session above belongs to. get_admin_user re-checks the
        #account on every call, so without this row a valid token still 401s.
        "user_id": 42,
        "name": "Session Owner",
        "role": "admin",
        "is_active": True,
        "auth_provider": "local",
        "created_at": _FUTURE,
    }, {
        "user_id": 7,
        "name": "Existing Person",
        "role": "admin",
        "is_active": True,
        "auth_provider": "local",
        "created_at": _FUTURE,
    }]


#the four routes, with a body good enough to reach the database if the guard
#is not there. that matters: a request rejected for a missing field would
#look like a pass.
ROUTES = [
    ("post", "/api/users",
     {"name": "New Person", "role": "admin", "password": "pw", }),
    ("get", "/api/users", None),
    ("put", "/api/users/7", {"name": "Renamed"}),
    ("delete", "/api/users/7", None),
]


class TestUserRoutesRequireAdmin(unittest.TestCase):

    def setUp(self):
        _reset()
        self.client = FLASK_APP.test_client()

    def _call(self, method, path, body, headers):
        send = getattr(self.client, method)
        if body is None:
            return send(path, headers=headers)
        return send(path, headers=headers, json=body)

    def test_no_token_is_refused(self):
        for method, path, body in ROUTES:
            with self.subTest(route=f"{method.upper()} {path}"):
                resp = self._call(method, path, body, {})
                self.assertEqual(resp.status_code, 401)

    def test_invalid_token_is_refused(self):
        for method, path, body in ROUTES:
            with self.subTest(route=f"{method.upper()} {path}"):
                resp = self._call(method, path, body, GARBAGE)
                self.assertEqual(resp.status_code, 401)

    def test_nothing_is_written_without_a_token(self):
        for method, path, body in ROUTES:
            with self.subTest(route=f"{method.upper()} {path}"):
                _reset()
                self._call(method, path, body, {})
                self.assertEqual(
                    FAKE.writes, [],
                    f"{method.upper()} {path} touched the database unauthenticated",
                )

    def test_listing_users_leaks_nothing_without_a_token(self):
        resp = self.client.get("/api/users")
        self.assertEqual(resp.status_code, 401)
        self.assertNotIn(b"Existing Person", resp.data)

    def test_valid_token_still_gets_through(self):
        resp = self.client.get("/api/users", headers=VALID)
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b"Existing Person", resp.data)


if __name__ == "__main__":
    unittest.main(verbosity=2)
