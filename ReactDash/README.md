<img width="465" height="366" alt="image" src="https://github.com/user-attachments/assets/26989391-dba3-4a42-a07d-82bc31d30623" /># Admin Dashboard
This repository contains the **Admin Dashboard frontend** for the Species Database App.

The Admin Dashboard is used by authorised admins to manage all backend data that powers the mobile app and PWA used by the Rai Matak reforestation program.

This dashboard is not accessible to general users or field users

## What This Dashboard Is Used For

Admins can usethis dahboard to:
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
<img width="970" height="469" alt="Untitled drawing" src="https://github.com/user-attachments/assets/fb3cfd48-2bfc-4047-81eb-2b7c58b95ab5" />


## Project Structure

src/
 ├── Components/
 │   ├── AdminLayout.tsx # wraps all admin pages
 │   ├── drawer.tsx # side navigation
 │   ├── ProtectedAdmin.tsx # route protection
 │   ├── DrawerComponent.tsx # renders the side navigation drawer
 │   ├── TableLayout.tsx # shared layout wrapper for table-based pages
 │   ├── DeleteConfirmModal.tsx # reusable confirmation dialog for deletions
 │   ├── UserForm.tsx # Form component for creating and editing admin users
 │   └── UserTable.tsx # table component displaying admin users
 │
 ├── Pages/
 │   ├── Home.tsx # dashboard landing page
 │   ├── AdminLoginForm.tsx # login page (Supports local admin login (username + password) and Google Sign-In
 │   ├── Species.tsx # species table (delete, edit entry point)
 │   ├── AddEntry.tsx # add species
 │   ├── EditEntry.tsx # edit species (allows updates, re-translation, and deletion)
 │   ├── AddExcel.tsx # Bulk upload page for species data
 │   ├── MediaManager.tsx # Used to add, edit, and delete media metadata
 │   ├── Users.tsx # Allows creation, editing, activation/deactivation and deletion of admin user accounts
 │   ├── Analytics.tsx # Analytics overview #Displays high-level system usage metrics
 │   └── Audit.tsx # Allows admins to upload Excel or CSV files for validation and quality checks before or after data import.
 │
 ├── utils/
 │   └── adminFetch.ts # authenticated API helper
 │
 ├── types/ # Shared TypeScript types
 ├── App.tsx # Routing + layout wiring
 ├── main.tsx # App entry point

## For Local ENV 
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
