# Database migrations

Every change to the SDA database schema goes in this folder, as a numbered SQL file, committed alongside the code that needs it.

## Why this exists

Schema changes used to live entirely in `services/flask-api/TableSchema.sql`, partly as `CREATE TABLE` statements and partly as commented-out `ALTER TABLE` lines somebody had to spot and run by hand. Nothing recorded which changes had reached which database.

That failed in production.
Three columns were in the schema file and the application code but not in the live database.
They were `species_en.definition`, `species_tet.definition` and `media.storage_version`.
The gap lasted three months, because nothing checked for it.

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

Run the harness before you apply a migration anywhere:

```bash
bash services/flask-api/migrations/test_migration.sh
```

It needs local PostgreSQL server binaries (`brew install postgresql@16`, or `apt install postgresql`).
It uses the newest installed version.
It never reads `.env` and never connects to Supabase.

The harness runs these steps on a throwaway cluster:

| Step | Check |
|---|---|
| 0 | Start the cluster and create the Supabase roles `anon`, `authenticated` and `service_role` |
| 1 | Load `TableSchema.sql`, with the default grants that Supabase gives those roles |
| 2 | Apply every rollback in reverse order, then assert the pre-migration baseline |
| 3 | Seed representative rows |
| per migration | Run `check_NNN`: apply, verify, re-apply, roll back, roll back again, check that every row is back exactly, apply again |
| 4 | Build a second database from `TableSchema.sql` and require an identical `pg_dump --schema-only` |

Step 4 proves that the snapshot and the migration chain build the same schema.
The baseline asserts in step 2 stop a wrong rollback and a wrong snapshot from hiding each other.
The baseline is the snapshot with every migration rolled back.
It is only as accurate as the snapshot.
The harness cannot see the live database.
After any change made outside a migration, match `TableSchema.sql` to prod again.

CI runs the harness in the `migration-harness` job of `.github/workflows/ai-backend-tests.yml`.

A new migration needs a `check_NNN` function in `test_migration.sh`.
The harness fails when that function is missing.

## Applying to Supabase

Supabase Dashboard, SQL Editor, paste the migration, Run. Take a backup first (Database, Backups) for anything non-additive.

Apply to a development project before a shared or production one, and record the date and target in the project knowledge base.

## Migration log

| # | Description | Applied to dev | Applied to shared/prod |
|---|---|---|---|
| 001 | Add `species_en.definition`, `species_tet.definition`, `media.storage_version` | 2026-11-13, in the rebuild from `TableSchema.sql` | 2026-11-12 |
| 002 | Enable RLS on every public table and revoke `anon` and `authenticated` access | not yet | not yet |

Snapshot matches with prod, newest last.
Add a line each time you match `TableSchema.sql` to prod again.

- 2026-11-13: commit `1f094ce`

The 001 dates come from `supabase_migrations.schema_migrations` on each project.
Prod recorded `001_add_definition_and_storage_version` at version `20261112075901`.
Dev recorded `rebuild_dev_from_table_schema` at version `20261113093539`, and that snapshot already held 001.

> Keep this table current. A migration that exists but has not been applied anywhere is exactly the failure this folder was created to prevent.
