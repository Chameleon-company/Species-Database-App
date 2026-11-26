# Rai Matak Species Guide

English-Tetum bilingual field application for offline species guidance and Rai Matak reforestation support.

## Project Overview

The Rai Matak Species Guide supports field staff, botanists, and community partners working in Timor-Leste. The app provides offline access to species identification data, ecological notes, photos, and learning resources.

## Repository Layout

```
apps/
  admin/          React admin dashboard
  api/            new TypeScript API (Hono), replaces the Flask API route by route
  field/          new Preact field app, not deployed yet
  field-legacy/   static field app that runs in production today
  android/        Capacitor Android wrapper around field-legacy
services/
  flask-api/      Flask API that runs in production today, with its tests and migrations
ml/
  training/       species identification model, training code and results
  data/           species data files
  species-cli/    command-line tool for the species data
docs/
  backend/        API reference and backend notes
  testing/        T2 testing reports
packages/         shared workspace packages
scripts/          OS install scripts
supabase/         Supabase CLI config and seed data for the local database
```

The JavaScript apps share one pnpm workspace, defined in `pnpm-workspace.yaml`. Shared dependency versions live in its `catalog:` section, and `pnpm-lock.yaml` is the only lockfile.

## Recommended Setup with Docker

Use this path when joining the project for the first time. Docker starts the backend and the admin dashboard together.

### 1. Install Prerequisites

Install these before running project commands:

- Git
- Docker Desktop, or Docker Engine with Docker Compose v2
- Node.js 22.18 or newer
- pnpm, installed with `npm install -g pnpm`

Windows 11:

1. Install Git for Windows.
2. Install Docker Desktop.
3. Install Node.js 22.18 LTS or newer.
4. Open Docker Desktop and wait until the engine is running.
5. Open PowerShell from the repository root.

macOS:

1. Install Git.
2. Install Docker Desktop for Mac.
3. Install Node.js 22.18 LTS or newer.
4. Open Docker Desktop and wait until it is running.
5. Open Terminal from the repository root.

Linux:

1. Install Git.
2. Install Docker Engine with Docker Compose v2, or Docker Desktop for Linux.
3. Install Node.js 22.18 LTS or newer.
4. Confirm Docker is running:

   ```bash
   docker compose version
   ```

5. Open a terminal from the repository root.

### 2. Clone the Repository

```bash
git clone https://github.com/Chameleon-company/Species-Database-App.git
cd Species-Database-App
```

### 3. Install Dependencies

```bash
pnpm install
```

This installs the Supabase CLI that the next steps use.

### 4. Create the Environment File

The backend, the admin dashboard and the field app all read the one `.env` file in the repository root.

Create `.env` from the template:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

The template works as it is.
It points the app at the local Supabase stack, and its keys are the fixed defaults of the Supabase CLI.
You need no key from the project owner.

`SUPABASE_URL` is the address that browsers use.
`SUPABASE_INTERNAL_URL` is the address that the backend container uses.
If you point `SUPABASE_URL` at another project, delete `SUPABASE_INTERNAL_URL`.

Google sign-in works only if `http://localhost:5173` is an authorized origin of the OAuth client.
Password sign-in works without Google.

Do not commit `.env`.

### 5. Start the App

From the repository root:

```bash
pnpm run dev
```

This starts the local Supabase stack, then builds and starts the app containers.
The first start downloads the Supabase images, which takes a few minutes.

| Service | URL |
| --- | --- |
| Admin dashboard | `http://localhost:5173` |
| Field app (`apps/field-legacy`) | `http://localhost:5500` |
| Backend API | `http://localhost:5000` |
| Supabase API | `http://127.0.0.1:54321` |
| Supabase Studio | `http://127.0.0.1:54323` |

Leave the terminal open while the app is running.

### 6. Sign In to the Local Admin

Open `http://localhost:5173` and sign in with these values:

| Field | Value |
| --- | --- |
| Name | `admin` |
| Password | `admin` |

This account exists only in your local database.

### 7. Check That It Works

Check container status:

```bash
docker compose ps
```

The backend should show as `healthy`.

Check the backend API:

```bash
curl http://localhost:5000/api/bundle
```

The setup is working when `/api/bundle` returns 22 species in `species_en` and 22 in `species_tet`.

### 8. Stop the App

```bash
pnpm run docker:down
```

This stops the app containers and the Supabase stack.
The local database keeps its data until the next `pnpm supabase db reset`.

## Local Database

`pnpm run dev` runs `supabase start`, which uses `supabase/config.toml`.
On the first start, and on each `pnpm supabase db reset`, the CLI loads these files in this order:

1. `services/flask-api/TableSchema.sql`, the full schema with RLS on every table
2. `supabase/seed.sql`, the 22 species in English and Tetum, 4 sample photos of Toona ciliata and the `admin` user

The CLI also creates the public Storage buckets `species_images`, `media` and `species_videos`.
It uploads the photos in `apps/field-legacy/Assets/Images/toona-ciliata` to `species_images`.

The backend uses the local secret key, so RLS behaves as it does on the hosted projects.
The `anon` and `authenticated` roles have no access to any table.

`supabase/seed.sql` stops with an error on any database that does not use the CLI default JWT secret.
This stops the seed from creating the `admin` user on a hosted project.

The app containers listen on `127.0.0.1` only.
The Supabase CLI publishes its ports on every network interface.
These are the API on `54321`, Postgres on `54322` with the password `postgres`, and Studio on `54323`.
On a shared network, other devices can reach all three with the public local keys.
Run `pnpm run docker:down` when you do not use the stack.

To rebuild the database from the files, run:

```bash
pnpm supabase db reset
```

Run it after a change to `TableSchema.sql` or `supabase/seed.sql`.
It deletes every local change, such as uploaded photos and edited species.

`supabase/migrations/` stays empty.
`TableSchema.sql` and `services/flask-api/migrations/` stay the only schema source.

## Common Commands

```bash
pnpm run dev           # Start Supabase, then build and start Docker containers
pnpm run docker:down   # Stop Docker containers and Supabase
pnpm supabase db reset # Rebuild the local database from the schema and seed
pnpm run docker:logs   # Follow container logs
pnpm run docker:build  # Build Docker images only
pnpm run build         # Build every app in the workspace
pnpm run lint          # Lint the workspace with Oxlint
pnpm run supabase:api  # Start only the database, Kong and PostgREST, as CI does. Stop it before pnpm run dev
pnpm run test          # Run the tests of every app. The API tests need the local stack
pnpm run format        # Format the workspace with Oxfmt
pnpm run format:check  # Check formatting without changing files
```

`pnpm run lint` runs Oxlint from the repository root with the rules in `.oxlintrc.json`.
It uses type-aware rules, which need TypeScript 7.
`pnpm run format` uses `.oxfmtrc.json`, and its `ignorePatterns` list the folders it skips.

## Optional Local Development

Use this path only when you need to run services outside Docker.

### 1. Install Local Prerequisites

Install:

- Node.js 22.18 or newer
- pnpm, installed with `npm install -g pnpm`
- Python 3.12 or newer

### 2. Run the OS Install Script

From the repository root, run the command for your OS:

```bash
pnpm run install:linux
pnpm run install:macos
pnpm run install:windows11
```

The script installs Node dependencies, creates `services/flask-api/venv`, installs Python requirements, and creates `.env` from `.env.example` if it does not exist.

### 3. Start Local Services

Start the local Supabase stack:

```bash
pnpm supabase start
```

This starts every Supabase service, which the admin and Flask need.
`pnpm run supabase:api` starts only the services that the Hono API and its tests use.

Activate the backend virtual environment, then start the backend:

```bash
source services/flask-api/venv/bin/activate        # Linux and macOS
services\flask-api\venv\Scripts\Activate.ps1   # Windows PowerShell
pnpm run dev:backend
```

Start the admin dashboard in another terminal:

```bash
pnpm run dev:admin
```

Start the new field app in another terminal:

```bash
pnpm run dev:field
```

Start the new Hono API in another terminal:

```bash
pnpm run dev:api
```

The Hono API reads `SUPABASE_URL` and `SUPABASE_KEY` from the root `.env`, and prints the Supabase host when it starts.

Local URLs:

- Admin dashboard: `http://localhost:5173`
- Field app: `http://127.0.0.1:5174`
- Backend API: `http://localhost:5000`
- Hono API: `http://localhost:3000`

The field app in `apps/field` is the Preact rebuild of the field app.
Production and the Android app still use `apps/field-legacy`.
`render.yaml` does not deploy `apps/field`.
The `apps/field` build fails when its first load is over 50 KiB gzip.
The budget is in `apps/field/vite.config.ts`.

## Static Field-User Frontend

The live field-user frontend is the static HTML app in `apps/field-legacy`.
`pnpm run dev` serves it at `http://localhost:5500`.

The app calls the API at `http://127.0.0.1:5000` when you open it over HTTP on `localhost` or `127.0.0.1`.
Otherwise it calls the production API.

The app's service worker serves its own files from a cache first.
After you change a file in `apps/field-legacy`, unregister the service worker in the browser developer tools, then reload.

## Android App

The Android project is managed through Capacitor in `apps/android`.

### 1. Install Prerequisites

Install:

- Android Studio
- Android SDK through Android Studio
- Node.js 22.18 or newer
- Project dependencies through one of the OS install scripts

### 2. Open the Android Project

```bash
cd apps/android
pnpm exec cap sync android
pnpm exec cap open android
```

### 3. Run from Android Studio

1. Wait for Gradle sync to finish.
2. Select a connected Android device or emulator.
3. Run the app from Android Studio.

Repeat `pnpm exec cap sync android` after changing static frontend files.

## Key Features

- Bilingual English and Tetum content
- Offline field access
- Species search and filtering
- Species profiles with photos and ecological notes
- Admin tools for species data, media, audit history, analytics, and users

## Admin Authentication and Session Security

The admin system supports:

- Single active session per admin user
- Short-lived access tokens and refresh tokens
- Refresh token rotation
- Session revocation on logout, expiry, or replacement
- Audit logging for authentication events

Main authentication endpoints:

- `POST /api/auth/admin-login`
- `POST /api/auth/google-admin`
- `POST /api/auth/admin-logout`
- `POST /api/auth/admin-refresh`
- `GET /api/admin/session-audit`

## Backend API Reference

Endpoint-by-endpoint documentation, including which endpoints require an admin session, is in [`docs/backend/API.md`](docs/backend/API.md).

## Database Schema Changes

`services/flask-api/TableSchema.sql` is a **snapshot of the full intended schema**, and it's how you create a new database from scratch. It is not a change history, and it can't tell you what state an existing database is in.

Changes to an existing database go in `services/flask-api/migrations/` as numbered SQL files, each with a matching rollback. Read [`services/flask-api/migrations/README.md`](services/flask-api/migrations/README.md) before adding one.

Two rules matter most:

1. **Apply the migration before merging the code that needs it.** New code that reads a column which does not exist yet fails immediately. Reverse the order when rolling back.
2. **Never edit a migration that has already been applied anywhere.** Supersede it with a new one.

After a change to `TableSchema.sql`, run `pnpm supabase db reset` to rebuild your local database.
Then run `pnpm gen:types` and commit `packages/shared/src/database.ts` with the change.

Verify a migration against a throwaway local database before it goes near Supabase:

```bash
bash services/flask-api/migrations/test_migration.sh
```

It builds a throwaway PostgreSQL cluster from `TableSchema.sql` and rolls every migration back to the baseline.
Then it applies each migration and checks idempotency, rollback and data survival.
It checks that every table in `public` has RLS on.
It checks that `anon` and `authenticated` have no access to any table, sequence or function in `public`.
It also checks that `TableSchema.sql` and the migration chain build the same schema.
It needs local PostgreSQL server binaries.
It uses the newest installed version.
It never reads `.env` and never connects to Supabase.
`services/flask-api/migrations/README.md` lists every step.

## Backend Tests

```bash
cd services/flask-api
python -m pip install -r requirements.txt -r requirements-test.txt
python -m pytest tests -v
```

The suite runs fully offline. Supabase is stubbed, so it makes no network calls and can't touch shared data. It covers app startup and route registration, the admin authentication surface, the guard on `POST /upload-species`, and the search-filter and media-URL validation.

## Deployment

Production runs on Render, and `render.yaml` defines every service.

| Supabase project | Ref | Use |
| --- | --- | --- |
| `species-database-dev` | `tdiquvydwzxmtludjmpe` | Shared test project. Local development does not use it. |
| `species-database-prod` | `oppcngtkhywxsazeqqet` | Production only. Its keys live in Render. |

| Service | URL | Source |
| --- | --- | --- |
| API | `https://species-database-api.onrender.com` | `services/flask-api` and the model in `ml/training` |
| Admin dashboard | `https://species-database-app-123.onrender.com` | `apps/admin` |
| Field web app | `https://species-database-app-1.onrender.com` | `apps/field-legacy` |

Each service deploys from `master` when every GitHub check on the commit passes.
A failed check stops the deploy, and the last good deploy stays live.
Each service rebuilds only when a file in its own source paths changes.

`SUPABASE_URL` and `SUPABASE_KEY` are marked `sync: false` in `render.yaml`.
Their values live only in the Render dashboard, never in git.
Every other value in `render.yaml` is public.
Keep the admin origin first in `CORS_ORIGINS`, because the API links to the first origin.
`https://localhost` in `CORS_ORIGINS` is the origin of the Capacitor Android app.
`GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` must hold the same OAuth client ID.

Render links each service to its Blueprint entry by service name.
Renaming a service does not change its `onrender.com` URL.
The Android app and the field app hardcode these URLs.
A new service URL needs a new app release.

The API runs in Render's `singapore` region, beside the Supabase projects in `ap-southeast-1`.
Render has no Australian region.
Render cannot move a service to another region.
A region change needs a new service.

## Security and CI/CD

The project includes security scanning for dependencies and secrets. See `SECURITY.md` for vulnerability reporting guidance.

The backend tests run on every pull request and every push to `master` that changes `services/flask-api` or `ml/training`.

Known unauthenticated endpoints that should require an admin session are listed under **Known gaps** in [`docs/backend/API.md`](docs/backend/API.md).

> **Working with `.env`:** the backend's `SUPABASE_KEY` is a secret key with `service_role` rights.
> It bypasses row-level security and can run schema changes.
> The key in `.env.example` is the public default of the local Supabase stack.
> Never put a hosted project key on your machine.

## Troubleshooting

Docker is not running:

1. Open Docker Desktop.
2. Wait until the engine is running.
3. Run `docker compose ps` again.

Port already in use:

1. Stop any existing service using ports `5000`, `5173`, `5500` or `54321` to `54323`.
2. Run `pnpm run docker:down`.
3. Run `pnpm run dev` again.

Environment values missing:

1. Confirm `.env` exists in the repository root.
2. Compare `.env` with `.env.example`, and copy any missing line.
3. Restart Docker with `pnpm run docker:down` and `pnpm run dev`.

Admin dashboard opens but data does not load:

1. Check backend status with `docker compose ps`.
2. Check logs with `pnpm run docker:logs`.
3. Confirm `VITE_API_BASE` and `VITE_API_URL` point to `http://localhost:5000`.
4. Run `pnpm supabase status` and confirm the local stack is running.

---

*Rai Matak Species Guide | Timor-Leste Reforestation Program*
