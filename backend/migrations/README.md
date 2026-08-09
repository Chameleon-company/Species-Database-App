# Database migrations

Every change to the SDA database schema goes in this folder, as a numbered SQL file, committed alongside the code that needs it.

## Why this exists

Schema changes used to live entirely in `backend/TableSchema.sql`, partly as `CREATE TABLE` statements and partly as commented-out `ALTER TABLE` lines somebody had to spot and run by hand. Nothing recorded which changes had reached which database.

That has failed in production. Three columns (`species_en.definition`, `species_tet.definition`, `media.storage_version`) exist in the schema file and are read and written by application code, but do not exist in the live database. Nobody noticed for three months, because nothing checks.

`TableSchema.sql` is still useful as a **snapshot of the intended full schema**, and it's how you create a brand new database from scratch. What it can't do is tell you what state an existing database is in. That's what this folder is for.

## Naming

```
NNN_short_description.sql              -- forward migration
NNN_short_description.rollback.sql     -- matching rollback
```

`NNN` is a zero-padded sequence number. Never renumber or edit a migration that has been applied anywhere. Supersede it with a new one instead.

## Rules

1. **Every forward migration ships with a rollback.** If a rollback is destructive or genuinely impossible, say so explicitly in the file header rather than omitting it.
2. **Make them idempotent.** Use `IF NOT EXISTS` / `IF EXISTS`. Re-running a migration should be a no-op rather than an error, because you won't always be sure whether it ran.
3. **Wrap in a transaction.** `BEGIN; ... COMMIT;` so a partial failure leaves no half-applied schema.
4. **Additive changes first.** Prefer adding nullable columns, or `NOT NULL` with a `DEFAULT`, over anything that rewrites or drops. Additive changes are safe to apply *before* the code that uses them ships.
5. **Apply schema before merging code.** New code that reads a column which does not exist yet fails immediately. Reverse the order for rollbacks: revert the code first, then the schema.
6. **Test against a scratch database first**, never straight against a shared project. See below.
7. **Update `TableSchema.sql` in the same commit**, so the snapshot and the migration history agree.

## Testing a migration before applying it

The whole checklist is automated. It builds a throwaway PostgreSQL cluster, seeds it with the schema **currently deployed** (`upstream/master`), applies the migration, and tears everything down again:

```bash
bash backend/migrations/test_migration.sh
```

It requires local PostgreSQL binaries (`brew install postgresql@14`, or `apt install postgresql`). It never reads `backend/.env` and never connects to Supabase, so it cannot touch the shared project.

The twelve checks it runs:

| # | Check |
|---|---|
| 0-1 | Throwaway cluster up; seeded from `upstream/master`'s `TableSchema.sql` |
| 2 | Target columns confirmed **absent** first, reproducing the live drift |
| 3 | Representative rows seeded (an empty table hides failures that real rows expose) |
| 4 | Migration applies; all 3 columns created with the intended types |
| 5 | Existing rows backfill correctly (`storage_version = 1`, `definition` NULL) |
| 6 | **Idempotent**, re-applying is a clean no-op |
| 7 | Columns actually work: `definition` writable, `storage_version` increments |
| 8 | `NOT NULL` on `storage_version` is enforced |
| 9 | Rollback removes all three columns |
| 10 | Rollback is itself idempotent |
| 11 | **No data lost** across apply then rollback |
| 12 | `TableSchema.sql` still builds a correct database from scratch, with `admin_session_audit` intact |

Point it at a different baseline with `BASE_REF=origin/master bash backend/migrations/test_migration.sh`.

Last run: **all 12 passed** against PostgreSQL 14.22 on 2026-08-10.

If you add a migration, extend the script with checks for it. A migration that has never been run against a database shaped like the real one has not been tested.

## Applying to Supabase

Supabase Dashboard, SQL Editor, paste the migration, Run. Take a backup first (Database, Backups) for anything non-additive.

Apply to a development project before a shared or production one, and record the date and target in the project knowledge base.

## Migration log

| # | Description | Applied to dev | Applied to shared/prod |
|---|---|---|---|
| 001 | Add `species_en.definition`, `species_tet.definition`, `media.storage_version` | not yet | not yet |

> Keep this table current. A migration that exists but has not been applied anywhere is exactly the failure this folder was created to prevent.
