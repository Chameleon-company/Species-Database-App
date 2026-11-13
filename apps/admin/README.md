# Admin dashboard

This app is the admin dashboard for the Species Database App.
Authorised admins use it to manage the data behind the field app and PWA for the Rai Matak reforestation program.
General users and field users have no access to it.

## What admins do here

- Add, edit and delete species in English and Tetum.
- Upload species data in bulk from an Excel file.
- Manage media records (images and videos for each species).
- Manage admin users and roles.
- Read usage analytics.
- Audit a spreadsheet before an import.

## Tech stack

| Part | Choice |
| --- | --- |
| UI | React 19, TypeScript, Vite |
| Components | shadcn/ui (Radix, `new-york` style) from the `@sda/ui` workspace package |
| Styling | Tailwind CSS v4 with the theme tokens in `packages/ui/src/styles/globals.css` |
| Forms | TanStack Form |
| Server data | TanStack Query |
| Tables | TanStack Table v9, through `@sda/ui/components/data-table` |
| Icons | lucide-react |
| Toasts | sonner |
| Sign-in | Username and password, or Google Identity |
| API | The Flask API in `services/flask-api` |

## Overview diagram

<img width="970" height="469" alt="Admin dashboard overview" src="https://github.com/user-attachments/assets/3d3b65ca-b421-492c-a820-b4712aa422f5" />

## Project structure

```text
src/
├── main.tsx                 entry: providers, router, toaster
├── index.css                font and the shared @sda/ui theme
├── app/
│   ├── App.tsx              routes
│   ├── queryClient.ts       TanStack Query defaults
│   └── layout/              auth guards, sidebar, top bar, logout
├── shared/
│   ├── api/                 adminFetch, session, requestJson and ApiError
│   ├── form/                useAppForm and the shadcn-bound text field
│   └── ui/                  Page, SearchField, ConfirmDialog, LoadError,
│                            FileDropzone, LanguageSwitch, table texts
├── features/
│   ├── home/                dashboard with the species table
│   ├── species/             list, create and edit form, spreadsheet import
│   ├── media/               media table, add and edit dialog, preview
│   ├── users/               user table and dialog
│   ├── analytics/           usage counters and per-user activity
│   ├── audit/               spreadsheet audit report
│   └── auth/                login page and Google Identity
├── translations.ts          { key: { en, tet } } view of the @sda/i18n catalogs
├── LanguageContext.tsx      language provider
└── useLanguage.ts           language hook that gives lang, setLang and t
```

Each feature folder holds its own `api.ts` with the queries and mutations for that feature.
Pages take `t` from `useLanguage()`.
The English and Tetum text lives in `packages/i18n/messages`.
Pages import shadcn components from `@sda/ui/components/<name>` and never through an index file.

Shared components live in `packages/ui`.
Other apps in the workspace can use them too.
To add a shadcn component, run `pnpm dlx shadcn@latest add <name>` in `apps/admin`.
The CLI writes the component into `packages/ui/src/components`.
After that, change its `import { cn } from "cn"` line to `import { cn } from "#lib/utils"`.
Then run `pnpm format` from the repository root, so Oxfmt formats the new file.
The `cn` in `#lib/utils` knows the theme's custom font sizes.

## Local environment

The admin dashboard reads the `.env` file in the repository root.
It uses `VITE_API_BASE`, `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID`.
See the root `README.md` for the values.

## Running the project locally

Start the backend API first.
Then run these commands from the repository root:

```
pnpm install
pnpm run dev:admin
```

## Deployment

`render.yaml` in the repository root defines the admin build.
See the Deployment section of the root `README.md`.
