This repository contains the **Admin Dashboard frontend** for the Species Database App.

The Admin Dashboard is used by authorised admins to manage all backend data that powers the mobile app and PWA used by the Rai Matak reforestation program.

This dashboard is not accessible to general users or field users

## What This Dashboard Is Used For

Admins can use this dahboard to:
- Add, edit and delete plant species both in English and Tetum
- Upload species data in bulk via Excel files
- Manage media metadata (images and videos linked to species)
- Manage admin users and roles
- View basic system analytics
- Audit datasets before importing them

---

## Tech Stack

- React +TypeScript
- Vite
- Material UI (MUI)
- Google Sign-In (admin only)
- REST API (Flask backend)

---

## Admin Dashboard Overview Diagram
<img width="970" height="469" alt="Untitled drawing (1)" src="https://github.com/user-attachments/assets/3d3b65ca-b421-492c-a820-b4712aa422f5" />


## Project Structure

```text
src/
 ├── Components/
 │   ├── AdminLayout.tsx           # wraps all admin pages
 │   ├── drawer.tsx                # side navigation
 │   ├── ProtectedAdmin.tsx        # route protection
 │   ├── DrawerComponent.tsx       # renders the side navigation drawer
 │   ├── TableLayout.tsx           # shared layout wrapper for table-based pages
 │   ├── DeleteConfirmModal.tsx    # reusable confirmation dialog for deletions
 │   ├── UserForm.tsx              # Form component for creating and editing admin users
 │   └── UserTable.tsx             # table component displaying admin users
 │
 ├── Pages/
 │   ├── Home.tsx                  # dashboard landing page
 │   ├── AdminLoginForm.tsx        # login page (Supports local admin login (username + password) and Google Sign-In
 │   ├── Species.tsx               # species table (delete, edit entry point)
 │   ├── AddEntry.tsx              # add species
 │   ├── EditEntry.tsx             # edit species (allows updates, re-translation, and deletion)
 │   ├── AddExcel.tsx              # Bulk upload page for species data
 │   ├── MediaManager.tsx          # Used to add, edit, and delete media metadata
 │   ├── Users.tsx                 # Allows creation, editing, activation/deactivation and deletion of admin user accounts
 │   ├── Analytics.tsx             # Analytics overview #Displays high-level system usage metrics
 │   └── Audit.tsx                 # Allows admins to upload Excel or CSV files for validation and quality checks before or after data import.
 │
 ├── utils/
 │   └── adminFetch.ts             # authenticated API helper
 │
 ├── types/                        # Shared TypeScript types
 ├── App.tsx                       # Routing + layout wiring
 └── main.tsx                      # App entry point

```
---

## Local environment

The admin dashboard reads the `.env` file in the repository root.
It uses `VITE_API_BASE`, `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID`.
See the root `README.md` for the values.

## Running the project locally

Start the backend API first, then run from the repository root:
```
pnpm install
pnpm run dev:admin
```

## Deployment

`render.yaml` in the repository root defines the admin build.
See the Deployment section of the root `README.md`.
