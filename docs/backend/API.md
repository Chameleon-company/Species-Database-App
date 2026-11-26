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

### Sign-in errors

`POST /api/auth/login` and `POST /api/auth/admin-login` take `{"name": ..., "password": ...}` and answer every failure with `{"error": ...}`. The field app (`login.js`) shows that text to the user.

| Status | `error` | When |
|---|---|---|
| 200 | | `login`: `{"user_id", "role"}`. `admin-login`: `{"access_token", "refresh_token", "expires_in"}` |
| 400 | `name and password required` (`missing fields` on admin-login) | A field is missing, empty or not a string |
| 401 | `invalid credentials` | Unknown name, wrong password, Google-only account, or a password over 72 bytes. All four look the same, and an unknown name still runs one bcrypt check so the timing matches |
| 403 | `account disabled` | Only after a correct password |
| 403 | `not an admin` | `admin-login` only, and only after a correct password |
| 429 | `Too many attempts, try again in N minutes` | Rate limit, see below. Sent with a `Retry-After` header in seconds |

`POST /api/auth/google-admin` returns 503 `google sign-in is not configured` when `GOOGLE_CLIENT_ID` is unset (without it Google's audience check would be skipped), and 401 when the token is invalid or Google has not verified the email address.

### Sign-in rate limit

Failed attempts are counted in a 15-minute sliding window:

| Key | Limit | Counts | Blocks |
|---|---|---|---|
| Name (case-insensitive) | 5 failures | 401s from `login` and `admin-login`, shared between the two | `login` and `admin-login`, always |
| Client IP | 30 failures | the same, plus invalid tokens on `google-admin` and `admin-refresh` | `admin-refresh` always. `login`, `admin-login` and `google-admin` only when `TRUSTED_PROXY_HOPS` is set, see below |

Once a key reaches its limit, further attempts get 429 until its oldest counted failure leaves the window, even with the right password. A correct password clears that name's count; it does not clear the IP's count. Unknown names are counted too, so a 429 says nothing about whether an account exists.

The per-IP block on `login`, `admin-login` and `google-admin` is off until `TRUSTED_PROXY_HOPS` is set explicitly to 1 or more. The hop count on Render is not confirmed, and with the wrong count every client can share one proxy address: 30 failures by anyone would then refuse sign-in to every field user and admin, correct passwords and Google sign-in included, for up to 15 minutes. While it is off, failures are still counted and logged per IP, and only the per-name limit applies, so guessing across many names from one address is limited to 5 failures per name. `admin-refresh` keeps its IP block regardless: each invalid token costs one bcrypt check per open admin session, no client calls the route today, and an admin whose refresh is refused can still sign in again.

The counts are kept in the memory of each gunicorn worker (no Redis). They are lost on restart and not shared between workers, so with N workers a client can make up to N times the limit. `render.yaml` runs one worker, so the limit is exact there. Anyone can lock a known name out for up to 15 minutes by failing 5 times; admins can still use Google sign-in.

The client IP comes from `X-Forwarded-For` through werkzeug's `ProxyFix`, which trusts the entries added by the last `TRUSTED_PROXY_HOPS` proxies (env var; unset, empty or not a number means `1`; `0` turns ProxyFix off for local runs without a proxy). The same address is stored in `admin_sessions.ip_address`. Setting it higher than the real number of proxies lets clients choose their own IP. Only an explicit value of `1` or more turns on the per-IP sign-in block; unset, empty, not a number and `0` leave it off.

To turn the IP block on after a deploy: make one failed sign-in, then find its log line `sign-in failed: path=... ip=... route=[...]` (a 429 logs `sign-in rate limit hit: ...` the same way), where `route` is the full forwarded chain, client first. On Render, requests also pass through Cloudflare. If `ip` is your own public address, set `TRUSTED_PROXY_HOPS=1` in the Render dashboard. If `ip` is a Cloudflare address and your address is second from the right in `route`, set `TRUSTED_PROXY_HOPS=2`. If neither, leave it unset and the IP block stays off. Even with the right hop count, everyone behind one office Wi-Fi or carrier NAT address shares an IP bucket, so once the block is on, 30 failures by anyone there refuse sign-in to all of them for up to 15 minutes, correct passwords and Google sign-in included.

## Species

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/bundle` | Public | Full species bundle for initial offline sync |
| GET | `/api/species/changes` | Public | Changelog entries for incremental sync. Takes `?since_version=` (0 to 2147483647, otherwise 400). Answers `force_bundle: true` with `reason: "client_ahead"` when `since_version` is above the server's latest changelog version (for example after production is restored from an older backup), so the device downloads the full bundle again |
| GET | `/api/species/incremental` | Public | Species rows changed since a given version, and the ids of deleted species. Same `since_version` range as `/api/species/changes` |
| GET | `/api/species/search` | Public | **New.** Search by common or scientific name |
| GET | `/api/species/<species_id>` | Admin | Single species record |
| POST | `/species` | Admin | Create a species |
| PUT | `/api/species/<species_id>` | Admin | Update a species |
| DELETE | `/api/species/<species_id>` | Admin | Delete a species. Deletes the Tetum row, then the English row. Media rows follow by cascade |
| PUT | `/api/species/<species_id>/english` | Admin | Update the English record only |
| PUT | `/api/species/<species_id>/tetum` | Admin | Update the Tetum record only |
| POST | `/upload-species` | Admin | Bulk upload species from a spreadsheet. Each row goes into `species_en`, then into `species_tet` with the same `species_id`. Stops at the first failing row, keeps the rows before it, and returns HTTP 500 with `error`, `rows_inserted` and `english_only` (English rows that could not be removed) |
| POST | `/audit-species` | Admin | Validate a spreadsheet without importing |

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

`media.storage_version` starts at 1 and increments whenever the stored file behind a record changes. Devices compare their cached value against the server's and re-download only when it differs, instead of re-pulling the whole media set. Added by [migration 001](../../services/flask-api/migrations/README.md).

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

## Errors

An exception no route handles is logged with its traceback and answered with HTTP 500 `{"error": "internal server error"}`. The exception text is never sent, because it can name the database, host or driver. HTTP errors (404, 405, 413 and so on) keep their status and a JSON `error`.

## Request size limits

`MAX_CONTENT_LENGTH` is 10 MB plus 64 KB for multipart framing. Werkzeug refuses a bigger body with 413 `{"error": "request body is too large (max 10 MB)"}` before it parses or spools it. Two routes set their own limit:

- `POST /upload-media/file` allows 50 MB plus framing, for videos.
- `POST /api/ai/identify` keeps its own error shape: `{"status": "error", "error": {"code": "image_too_large", ...}}` with 413 for a body or file over 10 MB, or an image over 16 megapixels. The pixel check reads only the image header, before any decoding. Decoding peaks at about 10 bytes per pixel (a 12 MP photo needs about 120 MB on top of the worker), and the worker decodes one image at a time.

## Server settings

`render.yaml` starts gunicorn with `--worker-class gthread --workers 1 --threads 8 --timeout 120`, sized for the starter plan (512 MB, 0.5 CPU):

- One worker process with pandas, numpy, the Supabase client and the TFLite model loaded measured about 165 MB. That is the working set on a Windows dev machine, not Render; check the service's memory metrics after deploy. A second worker would leave too little memory for a 50 MB video upload or an image decode.
- Most requests wait on Supabase, so 8 threads serve sync, bundle and sign-in in parallel within that one worker.
- With one worker the in-memory sign-in rate limit is exact.
- For gthread workers `--timeout` is a heartbeat, not a per-request limit: gunicorn kills a worker whose main loop has been silent that long. The loop is silent while the worker imports the app at boot (4-5 s on a full desktop core, longer on 0.5 CPU) and during a long C call that holds the GIL. 120 s instead of the default 30 s keeps either from killing the only worker and every request in it.
- The explicit `--workers 1` overrides `WEB_CONCURRENCY` or any other worker count set in the Render dashboard.

The Dockerfile uses the same settings.

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

- **`GET /api/auth/user-state` takes `user_id` from the query string** with no authorisation, so any user's state can be polled. A missing `user_id` now returns 400 instead of 200.
- **`GET /api/health` is unauthenticated and returns raw exception text** for any table it cannot reach, which can name the host, database and driver. This is the same problem `/health` had before it was fixed on this branch. It came in from `master` with the status dashboard work, so it is left alone here for the same reason as the rows above.

Fixing these means adding `get_admin_user` guards to endpoints owned by several different authors, so it is tracked separately rather than folded into the merge.

## Related

- [`services/flask-api/migrations/README.md`](../../services/flask-api/migrations/README.md), schema change process
- [`services/flask-api/tests/test_merge_readiness.py`](../../services/flask-api/tests/test_merge_readiness.py), offline test suite
