# Data fixes, 27 November 2026

One-off SQL for the production Supabase project (`oppcngtkhywxsazeqqet`). These change data, not schema, so they are not in `migrations/`. Run each file in the Supabase SQL editor: paste the whole file and run it. Each file is one transaction, so if any check fails, nothing changes.

Both scripts were tested on a throwaway Postgres that was built from `TableSchema.sql` and loaded with the production `/api/bundle` of 27 November 2026 (22 English species and 27 Tetum rows). The tests covered loading, a second run, the rollback, a forced failure, and migration 003 afterwards.

## 1. Admin sign-in with Google: `02-add-google-admins.template.sql`

**Problem:** "Sign in with Google" on the dashboard returned 403. `/api/auth/google-admin` verifies the Google token, then looks for a `users` row whose `name` is exactly the Google email, with role `admin`, and production had none.

**Fix:** replace the two example addresses with the real ones and run it. It turns an existing row into an active Google admin, or inserts one, and then lists every admin. It is safe to run more than once. The addresses are not committed because this repository is public.

## 2. Reviewed Tetum translation: `01-load-tetum-translation-20261127.sql`

**Source:** `tetum-translation-2026-11-27.xlsx`, the reviewed translation of all 22 species. Its English sheet matches production, so English is not changed.

**What the script does:**

- Replaces the Tetum text of the 22 species with the sheet's text.
- Leaf and fruit type use one Tetum term per type, as the owner decided on 27 November 2026, so the app's Tetum filters show 4 leaf and 4 fruit options. The workbook already carries these terms.
- Removes the 5 Tetum rows that have no English row (ids 23-27, the duplicates migration 003 describes).
- Logs `UPDATE` and `DELETE` in `changelog`, so installed apps download the full bundle on their next sync.
- Keeps a copy of `species_tet` as it was in `public.species_tet_backup_20261127`. The undo script is `rollback-01-load-tetum-translation-20261127.sql`.

On success the script prints `NOTICE: Tetum load OK: 22 species updated, 5 duplicate Tetum rows removed`.

Afterwards you can apply `migrations/003_merge_orphan_tetum_rows.sql`. With no duplicates left, it only adds the foreign key that stops new ones.

To regenerate the SQL after editing the workbook, run `python gen_sql.py` (it needs `openpyxl`). Once this pull request is deployed, the dashboard's import can also load the workbook directly and update species in place.
