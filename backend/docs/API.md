# SDA Backend API Reference

Flask API for the Rai Matak Species Guide. Base URL in local development is `http://localhost:5000`.

This document describes the API as it stands on the `backend` branch, which is `master` plus the six features listed under [Recent additions](#recent-additions).

## Authentication

Admin endpoints expect a session access token in the `Authorization` header, sent raw (no `Bearer` prefix):

```
Authorization: <access_token>
```

Get one from `POST /api/auth/admin-login` or `POST /api/auth/google-admin`. Tokens are short-lived; refresh with `POST /api/auth/admin-refresh`. Only one session per admin is valid at a time, so a new login revokes the previous session with reason `new_login` and the old token starts returning 401.

The **Auth** column below means:

| Value | Meaning |
|---|---|
| **Admin** | Valid admin session token required (`get_admin_user`) |
| **Public** | No authentication performed |

> **Note:** several `Public` rows below are endpoints that should probably require an admin session. See [Known gaps](#known-gaps). This table records how the API actually behaves, not how it ought to.

---

## Authentication endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Field-user login |
| GET | `/api/auth/user-state` | Public | Poll whether a user was disabled or had their role changed. Takes `?user_id=` |
| POST | `/api/auth/admin-login` | Public | Admin login with credentials; issues access + refresh tokens |
| POST | `/api/auth/google-admin` | Public | Admin login via Google ID token |
| POST | `/api/auth/admin-logout` | Token in header | Revokes the current admin session |
| POST | `/api/auth/admin-refresh` | Refresh token in body | Rotates the refresh token and issues a new access token |
| GET | `/api/admin/session-audit` | Admin | Audit history for the calling admin's own sessions |

## Species

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/bundle` | Public | Full species bundle for initial offline sync |
| GET | `/api/species/changes` | Public | Changelog entries for incremental sync |
| GET | `/api/species/incremental` | Public | Species changed since a given version |
| GET | `/api/species/search` | Public | **New.** Search by common or scientific name |
| GET | `/api/species/<species_id>` | Admin | Single species record |
| POST | `/species` | Public | Create a species |
| PUT | `/api/species/<species_id>` | Admin | Update a species |
| DELETE | `/api/species/<species_id>` | Admin | Delete a species |
| PUT | `/api/species/<species_id>/english` | Admin | Update the English record only |
| PUT | `/api/species/<species_id>/tetum` | Admin | Update the Tetum record only |
| POST | `/upload-species` | Admin | Bulk upload species from a spreadsheet |
| POST | `/audit-species` | Public | Validate a spreadsheet without importing |

### `GET /api/species/search`

Case-insensitive substring match against `common_name` and `scientific_name`.

```
GET /api/species/search?q=acacia
```

| Parameter | Required | Notes |
|---|---|---|
| `q` | yes | 1-100 characters. Longer is rejected with 400 |

Returns at most **50** rows.

```json
[
  { "species_id": 12, "common_name": "Ai-kamii", "scientific_name": "Casuarina equisetifolia" }
]
```

| Status | Meaning |
|---|---|
| 200 | Results (possibly an empty array) |
| 400 | `q` missing, empty, or longer than 100 characters |

The query is passed to PostgREST as a quoted literal, so `,` `.` and `*` in the query are treated as text rather than filter syntax.

## Media

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/upload-media` | Admin | Register a media item (metadata only) |
| GET | `/upload-media` | Admin | List media |
| PUT | `/upload-media/<media_id>` | Admin | Update a media record |
| DELETE | `/upload-media/<media_id>` | Admin | Delete a media record |

Media URLs supplied to `/upload-media` are validated: the URL must be `http`/`https`, must resolve to a public address, must return 200 to a `HEAD` request without redirecting, and must have a `Content-Type` matching the declared `media_type`.

### Species videos

Seed-germination videos for a species. Files live in external storage (Google Drive, S3); only the link and metadata are stored.

`download_link` and `streaming_link` are checked before they are stored: http or https only, and the hostname must resolve entirely to public addresses. A link pointing at loopback, a private range or the cloud metadata service is refused with a 400. No request is made to the URL itself, unlike `/upload-media`, because these are share pages rather than direct video files and would not return a `video/*` content type.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/species/<species_id>/videos` | Admin | Register a video against a species |
| GET | `/api/species/<species_id>/videos` | Public | List a species' videos, used by the field app |
| PUT | `/api/media/videos/<media_id>` | Admin | Update link or alt text |
| DELETE | `/api/media/videos/<media_id>` | Admin | Remove the video record |

**`POST /api/species/<species_id>/videos`**

```json
{
  "download_link": "https://storage.example.org/germination/tectona.mp4",
  "streaming_link": "https://storage.example.org/germination/tectona.m3u8",
  "alt_text": "Teak seed germination, days 1-21"
}
```

`streaming_link` defaults to `download_link`. `alt_text` defaults to empty.

| Status | Meaning |
|---|---|
| 201 | Created; returns `media_id` |
| 400 | Missing body or missing `download_link` |
| 401/403 | Not an authenticated admin |
| 404 | Species does not exist |
| 409 | That `download_link` is already registered for this species |

**`GET /api/species/<species_id>/videos`**

```json
{
  "species_id": 12,
  "videos": [
    {
      "media_id": 88,
      "species_id": 12,
      "species_name": "Tectona grandis",
      "download_link": "https://storage.example.org/germination/tectona.mp4",
      "streaming_link": "https://storage.example.org/germination/tectona.m3u8",
      "alt_text": "Teak seed germination, days 1-21",
      "storage_version": 1
    }
  ]
}
```

Returns 404 if the species does not exist, and `"videos": []` if it exists but has none.

**`PUT /api/media/videos/<media_id>`** accepts any of `download_link`, `streaming_link`, `alt_text`. Changing either link increments `storage_version`, which is the signal offline devices use to re-download the file. Returns 400 if the target record is not a video, 404 if it does not exist.

**`DELETE /api/media/videos/<media_id>`** removes the database record only; the file in external storage is untouched.

### `storage_version`

`media.storage_version` starts at 1 and increments whenever the stored file behind a record changes. Devices compare their cached value against the server's and re-download only when it differs, instead of re-pulling the whole media set. Added by [migration 001](../migrations/README.md).

## Users

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/users` | Public | Create a user |
| GET | `/api/users` | Public | List users |
| PUT | `/api/users/<user_id>` | Public | Update a user |
| DELETE | `/api/users/<user_id>` | Public | Delete a user |

## Analytics

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/analytics/overview` | Public | Aggregate usage counters |
| GET | `/analytics/users` | Public | Per-user activity |

## Utility

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/translate` | Public | Translate text to Tetum |
| GET | `/health` | Public | **New.** Liveness and database connectivity |
| GET | `/api/health` | Public | Per-table status for the admin dashboard. Came from `master`, see [Known gaps](#known-gaps) |

### `GET /health`

```json
{ "status": "healthy", "database": "connected" }
```

Returns 200 when a trivial query against `species_en` succeeds, and 500 with `{"status": "unhealthy", "database": "disconnected"}` when it doesn't. Failure detail goes to the server log rather than the response, because the endpoint is unauthenticated. `docker compose` uses this for its healthcheck.

Not to be confused with `/api/health`, which `master` added later and which walks every table for the status dashboard. Both routes are live. The handler behind `/health` is `basic_health_check`, renamed during the sync because Flask will not register two view functions under the same name.

---

## Request timing

Every request is timed by a `before_request`/`after_request` pair and logged as:

```
GET /api/species/search 200 0.04s
```

---

## Recent additions

Six endpoints and one bug fix reached the `backend` branch but not `master`:

| Change | Origin |
|---|---|
| 4 species-video endpoints | PR #184 |
| `media.storage_version` versioning | PR #204 |
| `species_*.definition` field | PR #205 |
| Restored admin guard on `POST /upload-species` | PR #203 |
| `GET /api/species/search` | PR #219 |
| `GET /health` | PR #212 |
| Request timing middleware | PR #219 |
| Media URL validation | PR #212 |

`definition` is a bilingual free-text field on both `species_en` and `species_tet`. Both tables must be updated together or the two languages drift apart.

## Known gaps

Recorded so they are not mistaken for intended behaviour. All of these exist on `master` today and are **not** introduced by the pending merge:

- **User management is unauthenticated.** `POST`, `GET`, `PUT`, `DELETE` on `/api/users` perform no authentication. `GET` discloses every user's name, role and active status; `DELETE` removes accounts.
- **Analytics endpoints are unauthenticated** and disclose per-user activity.
- **`POST /species` and `POST /audit-species` are unauthenticated.**
- **`GET /api/auth/user-state` takes `user_id` from the query string** with no authorisation, so any user's state can be polled.
- **`GET /api/health` is unauthenticated and returns raw exception text** for any table it cannot reach, which can name the host, database and driver. This is the same problem `/health` had before it was fixed on this branch. It came in from `master` with the status dashboard work, so it is left alone here for the same reason as the rows above.

Fixing these means adding `get_admin_user` guards to endpoints owned by several different authors, so it is tracked separately rather than folded into the merge.

## Related

- [`backend/migrations/README.md`](../migrations/README.md), schema change process
- [`backend/tests/test_merge_readiness.py`](../tests/test_merge_readiness.py), offline test suite
