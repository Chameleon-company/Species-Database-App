# Admin route audit (SDA-S04)

Every route in the Flask API (`services/flask-api`), who can call it and why.
Audited on `master`, November 2026. Decisions on `/api/health` and
`/api/ai/identify` from the backend lead (Omar).

**Admin check** = the route calls `get_admin_user()` and returns 401 without a
valid, unexpired, unrevoked admin session token in the `Authorization` header.

## Admin only (require a valid admin session)

| Method | Route | File | Who can call it | Why | Test |
|---|---|---|---|---|---|
| GET | `/api/resolve-image` | app.py | Admin | Fetches remote images for the admin media screen | test_admin_routes_auth |
| POST | `/upload-species` | app.py | Admin | Bulk species import from Excel | test_user_routes_auth |
| POST | `/audit-species` | app.py | Admin | Validates an import file before upload | test_user_routes_auth |
| POST | `/species` | app.py | Admin | Creates a species | test_user_routes_auth |
| GET | `/api/species/<id>` | app.py | Admin | Full record for the admin edit form | test_admin_routes_auth |
| PUT | `/api/species/<id>` | app.py | Admin | Edits a species | test_admin_routes_auth |
| DELETE | `/api/species/<id>` | app.py | Admin | Deletes a species | test_admin_routes_auth |
| PUT | `/api/species/<id>/english` | app.py | Admin | Edits the English record | test_admin_routes_auth |
| PUT | `/api/species/<id>/tetum` | app.py | Admin | Edits the Tetum record | test_admin_routes_auth |
| POST | `/translate` | app.py | Admin | Machine translation for editors | test_user_routes_auth |
| GET | `/analytics/overview` | app.py | Admin | Usage figures | test_user_routes_auth |
| GET | `/analytics/users` | app.py | Admin | Per-user activity (personal data) | test_user_routes_auth |
| POST | `/api/users` | app.py | Admin | Creates accounts | test_user_routes_auth |
| GET | `/api/users` | app.py | Admin | Lists accounts (personal data) | test_user_routes_auth |
| PUT | `/api/users/<id>` | app.py | Admin | Edits accounts and roles | test_user_routes_auth |
| DELETE | `/api/users/<id>` | app.py | Admin | Deletes accounts | test_user_routes_auth |
| GET | `/api/admin/session-audit` | auth_authz.py | Admin | Admin login history | test_admin_routes_auth |
| GET | `/api/admin/health` | app.py | Admin | Per-table status, moved here from `/api/health` in SDA-S04 | test_admin_routes_auth |
| POST | `/api/auth/admin-logout` | auth_authz.py | Admin (own token) | Validates the token itself before revoking it | test_user_routes_auth |
| POST | `/upload-media` | media.py | Admin | Registers a media item | test_admin_routes_auth |
| POST | `/upload-media/file` | media.py | Admin | Uploads an image or video file | test_admin_routes_auth, test_media_upload |
| GET | `/upload-media` | media.py | Admin | Lists the media library | test_admin_routes_auth |
| PUT | `/upload-media/<id>` | media.py | Admin | Edits media metadata | test_admin_routes_auth |
| DELETE | `/upload-media/<id>` | media.py | Admin | Deletes media | test_admin_routes_auth |
| POST | `/api/species/<id>/videos` | media.py | Admin | Adds a germination video | test_admin_routes_auth |
| PUT | `/api/media/videos/<id>` | media.py | Admin | Edits a video | test_admin_routes_auth |
| DELETE | `/api/media/videos/<id>` | media.py | Admin | Deletes a video | test_admin_routes_auth |

## Public on purpose (no admin check)

| Method | Route | File | Who can call it | Why |
|---|---|---|---|---|
| GET | `/` | app.py | Anyone | Status page |
| GET | `/privacy` | app.py | Anyone | Privacy policy must be public |
| GET | `/health` | app.py | Anyone | Liveness ping for Render, returns no data |
| GET | `/api/health` | app.py | Anyone | Returns only `{"status": "ok"}`, same as the Hono API (SDA-B01, SDA-B02). Per-table status moved to `/api/admin/health` |
| GET | `/api/bundle` | app.py | Field app | Offline species bundle; field users have no admin token |
| GET | `/api/species/changes` | app.py | Field app | Offline sync |
| GET | `/api/species/incremental` | app.py | Field app | Offline sync |
| GET | `/api/species/<id>/videos` | media.py | Field app | Shows germination videos to field users |
| POST | `/api/auth/login` | auth_authz.py | Field users | Login has to work without a session |
| GET | `/api/auth/user-state` | auth_authz.py | Field app | Checks whether an account is still active |
| POST | `/api/auth/admin-login` | auth_authz.py | Admin (before login) | Login has to work without a session |
| POST | `/api/auth/google-admin` | auth_authz.py | Admin (before login) | Google sign-in |
| POST | `/api/auth/admin-refresh` | auth_authz.py | Admin | Uses the refresh token, not the access token |
| POST | `/api/ai/identify` | ai_routes.py | Field app | Field app feature. Rate limiting is a separate ticket |

## Open question

| Method | Route | File | Current state | Question |
|---|---|---|---|---|
| GET | `/api/species/search` | app.py | No check | No app in the repo calls it. Asked in the SDA stream whether the admin or the field app uses it. Left unchanged until someone confirms, so the field app cannot break offline. |
