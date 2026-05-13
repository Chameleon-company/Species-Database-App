# Rai Matak Species Guide

English-Tetum bilingual field application for offline species guidance and Rai Matak reforestation support.

## Project Overview

The Rai Matak Species Guide supports field staff, botanists, and community partners working in Timor-Leste. The app provides offline access to species identification data, ecological notes, photos, and learning resources.

The repository includes:

- A Flask backend API in `backend`
- A React admin dashboard in `ReactDash`
- A static field-user frontend in `Frontend`
- A Capacitor Android wrapper in `capacitor-wrapper`

## Recommended Setup with Docker

Use this path when joining the project for the first time. Docker starts the backend and the admin dashboard together.

### 1. Install Prerequisites

Install these before running project commands:

- Git
- Docker Desktop, or Docker Engine with Docker Compose v2
- Node.js 22 or newer, including npm

Windows 11:

1. Install Git for Windows.
2. Install Docker Desktop.
3. Install Node.js 22 LTS or newer.
4. Open Docker Desktop and wait until the engine is running.
5. Open PowerShell from the repository root.

macOS:

1. Install Git.
2. Install Docker Desktop for Mac.
3. Install Node.js 22 LTS or newer.
4. Open Docker Desktop and wait until it is running.
5. Open Terminal from the repository root.

Linux:

1. Install Git.
2. Install Docker Engine with Docker Compose v2, or Docker Desktop for Linux.
3. Install Node.js 22 LTS or newer.
4. Confirm Docker is running:

   ```bash
   docker compose version
   ```

5. Open a terminal from the repository root.

### 2. Clone the Repository

```bash
git clone https://github.com/Chameleon-company/Species-Database-App.git
cd Species-Database-App
git checkout DevSecOps
```

### 3. Create the Environment File

The app needs Supabase and Google configuration values. Ask the project owner for the correct values before starting the app.

Create `.env` from the template:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Fill these values in `.env`:

```bash
SUPABASE_URL=
SUPABASE_KEY=
GOOGLE_CLIENT_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL_TETUM=
VITE_SUPABASE_PUBLISHABLE_KEY_TETUM=
VITE_GOOGLE_CLIENT_ID=
```

Keep these default local values unless your ports change:

```bash
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
VITE_API_BASE=http://localhost:5000
VITE_API_URL=http://localhost:5000/api
```

Do not commit `.env`.

### 4. Start the App

From the repository root:

```bash
npm run dev
```

This builds and starts:

- Admin dashboard: `http://localhost:5173`
- Backend API: `http://localhost:5000`

Leave the terminal open while the app is running.

### 5. Check That It Works

Check container status:

```bash
docker compose ps
```

The backend should show as `healthy`.

Check the backend API:

```bash
curl http://localhost:5000/api/bundle
```

Open the admin dashboard:

```text
http://localhost:5173
```

The setup is working when the dashboard opens and `/api/bundle` returns JSON.

### 6. Stop the App

```bash
npm run docker:down
```

## Common Commands

```bash
npm run dev           # Build and start Docker containers
npm run docker:down   # Stop Docker containers
npm run docker:logs   # Follow container logs
npm run docker:build  # Build Docker images only
npm run build         # Build the React admin dashboard
npm run lint          # Run React admin linting
```

## Optional Local Development

Use this path only when you need to run services outside Docker.

### 1. Install Local Prerequisites

Install:

- Node.js 22 or newer
- npm
- Python 3.12 or newer

### 2. Run the OS Install Script

From the repository root, run the command for your OS:

```bash
npm run install:linux
npm run install:macos
npm run install:windows11
```

The script installs Node dependencies, creates `backend/venv`, installs Python requirements, and creates `.env` from `.env.example` if it does not exist.

### 3. Start Local Services

Start the backend:

```bash
npm run dev:backend
```

Start the admin dashboard in another terminal:

```bash
npm run dev:admin
```

Local URLs:

- Admin dashboard: `http://localhost:5173`
- Backend API: `http://localhost:5000`

## Static Field-User Frontend

The field-user frontend is the static HTML app in `Frontend`.

Prerequisite:

- Visual Studio Code with the Live Server extension

Procedure:

1. Open the repository folder in Visual Studio Code.
2. Open `Frontend/index.html`.
3. Use Live Server to open the page in a browser.

## Android App

The Android project is managed through Capacitor in `capacitor-wrapper`.

### 1. Install Prerequisites

Install:

- Android Studio
- Android SDK through Android Studio
- Node.js 22 or newer
- Project dependencies through one of the OS install scripts

### 2. Open the Android Project

```bash
cd capacitor-wrapper
npx cap sync android
npx cap open android
```

### 3. Run from Android Studio

1. Wait for Gradle sync to finish.
2. Select a connected Android device or emulator.
3. Run the app from Android Studio.

Repeat `npx cap sync android` after changing static frontend files.

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

## Security and CI/CD

The project includes security scanning for dependencies and secrets. See `SECURITY.md` for vulnerability reporting guidance.

## Troubleshooting

Docker is not running:

1. Open Docker Desktop.
2. Wait until the engine is running.
3. Run `docker compose ps` again.

Port already in use:

1. Stop any existing service using ports `5000` or `5173`.
2. Run `npm run docker:down`.
3. Run `npm run dev` again.

Environment values missing:

1. Confirm `.env` exists in the repository root.
2. Confirm all Supabase and Google values are filled.
3. Restart Docker with `npm run docker:down` and `npm run dev`.

Admin dashboard opens but data does not load:

1. Check backend status with `docker compose ps`.
2. Check logs with `npm run docker:logs`.
3. Confirm `VITE_API_BASE` and `VITE_API_URL` point to `http://localhost:5000`.

---

*Rai Matak Species Guide | Timor-Leste Reforestation Program*
