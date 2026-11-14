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
| 4 | Fail if a `public` table has RLS off, or if `anon` or `authenticated` can use any relation, sequence or function in `public` |
| 5 | Build a second database from `TableSchema.sql` and require an identical `pg_dump --schema-only` |

Step 5 proves that the snapshot and the migration chain build the same schema.
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

## Applying 002

002 removes every `anon` and `authenticated` privilege in `public`.
The API keeps working only if its `SUPABASE_KEY` maps to `service_role`.

State before 002 on 2026-11-14:

| Item | Dev | Prod |
|---|---|---|
| RLS | On for `admin_session_audit` only | Same |
| Table grants | ALL for `anon` and `authenticated` on all 8 tables. No other table exists | Same |
| Sequence grants | ALL for `anon` and `authenticated` on all 8 sequences | Not read. Step 2 reads them |
| Default privileges of `postgres` and `supabase_admin` in `public` | ALL on tables and sequences, EXECUTE on functions, for `anon`, `authenticated` and `service_role` | Same |
| Functions and views in `public` | None | None |
| API key | `sb_secret_` key | JWT with `role` claim `service_role` |

These queries produce the database rows of the table:

- RLS and table grants:
  `select relname, relkind, relrowsecurity, relacl from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r', 'p', 'v', 'm', 'f');`
- Sequence grants:
  `select relname, relacl from pg_class where relnamespace = 'public'::regnamespace and relkind = 'S';`
- Default privileges:
  `select pg_get_userbyid(defaclrole), defaclobjtype, defaclacl from pg_default_acl where defaclnamespace = 'public'::regnamespace;`
- Functions:
  `select count(*) from pg_proc where pronamespace = 'public'::regnamespace;`

The rollback grants back the table privileges on the 8 named tables only.
A table created after 002 stays closed.
It grants back the sequence privileges on every sequence in `public`.
A sequence created after 002 opens again, which exposes no rows.
It also grants back the default privileges.

Steps:

1. Check the API key type.
   Never print the key.
   A legacy JWT key must carry the `role` claim `service_role`.
   Read only that claim.
   A new key must start with `sb_secret_`.
   Supabase maps that prefix to `service_role`.
   If the key is neither, stop.
   Set a `service_role` key on Render first.
2. Read the sequence grants on prod:
   `select relname, relacl from pg_class where relnamespace = 'public'::regnamespace and relkind = 'S';`
   Each row must show `anon=rwU` and `authenticated=rwU`.
   Save the output with the backup.
   If a row differs, add a REVOKE for that sequence at the end of the 002 rollback before you apply.
3. Take a backup in the dashboard (Database, Backups).
4. Run the 002 file in the SQL editor.
5. Check the security advisor.
   It must show no `rls_disabled_in_public` and no `pg_graphql_*_table_exposed` lint.
   It shows `rls_enabled_no_policy` (INFO) on all 8 tables.
   That INFO lint is the intended state.
6. Log in to the admin, and load `/api/bundle` from the field app.
7. If step 6 fails, the project owner takes over.
   A 15-minute limit starts then.
   Check the API key type again, because a wrong key is the likely cause.
   If the key is right, run the 002 rollback at once.
   If the key is wrong, set a `service_role` key on Render.
   If the API still fails when the 15 minutes end, run the 002 rollback.

Only the project owner runs the rollback.
The rollback opens `users.password_hash` to the public key again.

Two limits stay after 002:

- PostgreSQL grants EXECUTE on each new function to PUBLIC.
  Only a global default can stop that.
  A global default also strips EXECUTE from new `postgres` functions in the `extensions` schema.
  For that reason, 002 does not set one.
  Each migration that adds a function in `public` must revoke EXECUTE from PUBLIC.
  Harness step 4 fails when it does not.
  Create every function through a migration file, never by hand in the SQL editor.
  Then the harness sees it.
- `postgres` is not a member of `supabase_admin`.
  A migration cannot change the `supabase_admin` default privileges.
  Create tables through migrations, which run as `postgres`.
  An object that `supabase_admin` creates in `public` still opens to `anon`.
  The harness cannot see it.
  The security advisor is the live check.
  It flags such a table as `rls_disabled_in_public`.
  Check the advisor after any dashboard or extension change.

## Applying 003

003 merges the orphan Tetum rows and adds a foreign key from `species_tet.species_id` to `species_en.species_id`.
On dev and prod on 2026-11-14, `species_tet` rows 23 to 27 had no English row.
Each one was a cleaner Tetum translation of rows 1 to 5, with the same `scientific_name`.

003 is not additive.
It breaks rules 4 and 5 above.
The old bulk upload stores Tetum rows without an English id, and the foreign key refuses them.
Deploy the API with the new bulk upload first, then apply 003.

Steps:

1. Deploy the API from this branch.
2. Check that the orphans are the 5 rows above:
   `select t.species_id, t.scientific_name from species_tet t where not exists (select 1 from species_en e where e.species_id = t.species_id);`
3. Take a backup in the dashboard (Database, Backups).
4. Run the 003 file in the SQL editor.
   It stops with an error and changes nothing when an orphan has no single partner.
   An exact `scientific_name` match is required.
5. Check that `species_tet_s07_backup` holds 10 rows and the orphan query returns nothing.
6. Open a changed species in the admin, in English and in Tetum.

The rollback puts back every backed-up row and drops the foreign key.
It refuses to run when a partner row changed or went away after 003, because that change would be lost.
It also refuses when a `species_tet` or `species_en` row uses an orphan id again.
Only the project owner runs it.
Deleting a merged species through the admin removes its partner row, so the rollback then refuses.
To roll back anyway, first delete that pair from `species_tet_s07_backup`, so the deleted species stays deleted.

`species_tet_s07_backup` stays after 003, so that the rollback can work.
It is in `TableSchema.sql` for that reason.
Drop it with a later migration once the owner no longer needs the rollback.

## Migration log

| # | Description | Applied to dev | Applied to shared/prod |
|---|---|---|---|
| 001 | Add `species_en.definition`, `species_tet.definition`, `media.storage_version` | 2026-11-13, in the rebuild from `TableSchema.sql` | 2026-11-12 |
| 002 | Enable RLS on every public table and revoke `anon` and `authenticated` access in `public` | 2026-11-14 | not yet |
| 003 | Merge the orphan `species_tet` rows and require an English row for each Tetum row | 2026-11-14. Dev rolled back an earlier draft of 003 first | not yet |

Snapshot matches with prod, newest last.
Add a line each time you match `TableSchema.sql` to prod again.

- 2026-11-13: commit `1f094ce`

The 001 dates come from `supabase_migrations.schema_migrations` on each project.
Prod recorded `001_add_definition_and_storage_version` at version `20261112075901`.
Dev recorded `rebuild_dev_from_table_schema` at version `20261113093539`, and that snapshot already held 001.

> Keep this table current. A migration that exists but has not been applied anywhere is exactly the failure this folder was created to prevent.
