"""
SDA-S04: every admin route must refuse a caller without a valid admin session.
=============================================================================

test_user_routes_auth.py already covers /api/users, the species import
routes, analytics, /translate and logout. This file covers every other route
that calls get_admin_user(), so each admin route has at least one test.

For each route we check three things:
  1. no Authorization header        -> 401
  2. a made-up token                -> 401
  3. nothing was written to the database on the way to that 401

The request bodies are deliberately good enough to reach the database if the
guard were removed, so a 400 for a missing field can never look like a pass.

Reuses the offline Supabase fake from test_user_routes_auth.py, so nothing
here reaches the real project.

Run:  python -m pytest services/flask-api/tests/test_admin_routes_auth.py -v
"""

import unittest

from test_user_routes_auth import FAKE, FLASK_APP, GARBAGE, VALID, _reset


# (method, path, json body or None)
ADMIN_ROUTES = [
    # images
    ("get", "/api/resolve-image?url=https://example.com/a.jpg", None),

    # single species records
    ("get", "/api/species/1", None),
    ("put", "/api/species/1", {"common_name": "Changed"}),
    ("delete", "/api/species/1", None),
    ("put", "/api/species/1/english", {"common_name": "Changed"}),
    ("put", "/api/species/1/tetum", {"common_name": "Changed"}),

    # admin session audit log
    ("get", "/api/admin/session-audit", None),

    # media library
    ("post", "/upload-media",
     {"species_id": 1, "media_type": "image",
      "download_link": "https://example.com/a.jpg"}),
    ("post", "/upload-media/file", None),
    ("get", "/upload-media", None),
    ("put", "/upload-media/1", {"alt_text": "changed"}),
    ("delete", "/upload-media/1", None),

    # seed germination videos (write routes only; GET is public)
    ("post", "/api/species/1/videos",
     {"download_link": "https://example.com/v.mp4"}),
    ("put", "/api/media/videos/1", {"alt_text": "changed"}),
    ("delete", "/api/media/videos/1", None),
]


class TestAdminRoutesRequireAdminSession(unittest.TestCase):

    def setUp(self):
        _reset()
        self.client = FLASK_APP.test_client()

    def _call(self, method, path, body, headers):
        send = getattr(self.client, method)
        if body is None:
            return send(path, headers=headers)
        return send(path, headers=headers, json=body)

    def test_no_token_is_refused(self):
        for method, path, body in ADMIN_ROUTES:
            with self.subTest(route=f"{method.upper()} {path}"):
                resp = self._call(method, path, body, {})
                self.assertEqual(resp.status_code, 401)

    def test_invalid_token_is_refused(self):
        for method, path, body in ADMIN_ROUTES:
            with self.subTest(route=f"{method.upper()} {path}"):
                resp = self._call(method, path, body, GARBAGE)
                self.assertEqual(resp.status_code, 401)

    def test_nothing_is_written_without_a_valid_token(self):
        for headers in ({}, GARBAGE):
            for method, path, body in ADMIN_ROUTES:
                with self.subTest(route=f"{method.upper()} {path}",
                                  token="none" if not headers else "invalid"):
                    _reset()
                    self._call(method, path, body, headers)
                    self.assertEqual(
                        FAKE.writes, [],
                        f"{method.upper()} {path} wrote to the database "
                        "without a valid admin session",
                    )

    def test_session_audit_accepts_a_valid_token(self):
        # proves the 401s above come from the guard, not from a broken route
        resp = self.client.get("/api/admin/session-audit", headers=VALID)
        self.assertNotEqual(resp.status_code, 401)


if __name__ == "__main__":
    unittest.main(verbosity=2)
