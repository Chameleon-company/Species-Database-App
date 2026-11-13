#!/usr/bin/env bash
# =============================================================================
# Migration verification harness. See README.md for the checks it runs.
#
# Runs against a throwaway local PostgreSQL cluster. It never connects to
# Supabase and never reads .env.
#
# Requires PostgreSQL server binaries (initdb, pg_ctl, pg_dump, psql).
#   macOS:  brew install postgresql@16
#   Ubuntu: sudo apt install postgresql
#
# Usage: bash services/flask-api/migrations/test_migration.sh
# =============================================================================
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MIG="$REPO/services/flask-api/migrations"
SNAPSHOT="$REPO/services/flask-api/TableSchema.sql"
WORK=$(mktemp -d /tmp/sda-mig.XXXXXX) || { echo "!! FAIL: mktemp"; exit 1; }
DB=sda_mig_test
SNAPDB=sda_snapshot_test

best=""
best_v=""
for d in /opt/homebrew/opt/postgresql@*/bin /usr/local/opt/postgresql@*/bin /usr/lib/postgresql/*/bin; do
    [ -x "$d/initdb" ] || continue
    v=$("$d/initdb" --version | awk '{print $3}')
    [[ "$v" =~ ^[0-9]+(\.[0-9]+)*$ ]] || continue
    if [ -z "$best_v" ] || [ "$(printf '%s\n' "$best_v" "$v" | sort -V | tail -1)" = "$v" ]; then
        best=$d
        best_v=$v
    fi
done
[ -n "$best" ] && export PATH="$best:$PATH"

TABLES="users species_en species_tet changelog analytics media admin_sessions admin_session_audit"
TABLES_RLS_BEFORE_002="users species_en species_tet changelog analytics media admin_sessions"

fail() { echo "!! FAIL: $*"; exit 1; }
ok()   { echo "   ok: $*"; }
step() { echo; echo "=== $* ==="; }

cleanup() {
    if [ -d "$WORK/pgdata" ]; then
        pg_ctl -D "$WORK/pgdata" stop -m immediate >/dev/null 2>&1
    fi
    rm -rf "$WORK"
}
trap cleanup EXIT

for bin in psql initdb pg_ctl pg_dump createdb; do
    command -v "$bin" >/dev/null 2>&1 || fail "$bin not found on PATH"
done

pg()  { psql -h "$WORK" -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
pgq() { psql -h "$WORK" -U postgres -v ON_ERROR_STOP=1 -tAq "$@"; }
apply() { pg -d "$DB" -f "$1" >"$WORK/apply.log" 2>&1 || { tail -5 "$WORK/apply.log"; fail "applying $(basename "$1")"; }; }

fingerprint() {
    local union
    union=$(pgq -d "$DB" -c "SELECT string_agg(format('SELECT %L || x::text r FROM public.%I x', relname, relname), ' UNION ALL ' ORDER BY relname)
        FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'p');")
    pgq -d "$DB" -c "SELECT md5(string_agg(r, '|' ORDER BY r)) FROM ($union) q;" 2>&1
}

same_rows_as() {
    local now; now=$(fingerprint)
    [[ "$1" =~ ^[0-9a-f]{32}$ ]] || fail "could not fingerprint the rows before the migration: $1"
    [[ "$now" =~ ^[0-9a-f]{32}$ ]] || fail "could not fingerprint the rows after the rollback: $now"
    [[ "$now" == "$1" ]]
}

target_columns() {
    pgq -d "$DB" -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('definition','storage_version');"
}

rls_on() {
    pgq -d "$DB" -c "SELECT relrowsecurity FROM pg_class WHERE oid = 'public.$1'::regclass;"
}

client_access() {
    pgq -d "$DB" -c "SELECT count(*) FROM pg_class c, unnest(ARRAY['anon','authenticated']) r
        WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
        AND (has_table_privilege(r, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
             OR has_any_column_privilege(r, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES'));"
}

client_full_access() {
    pgq -d "$DB" -c "SELECT count(*) FROM pg_class c, unnest(ARRAY['anon','authenticated']) r
        WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
        AND (SELECT bool_and(has_table_privilege(r, c.oid, p))
             FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p);"
}

client_sequence_and_function_access() {
    pgq -d "$DB" -c "SELECT
        (SELECT count(*) FROM pg_class c, unnest(ARRAY['anon','authenticated']) r
         WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'S'
         AND has_sequence_privilege(r, c.oid, 'USAGE,SELECT,UPDATE'))
      + (SELECT count(*) FROM pg_proc f, unnest(ARRAY['anon','authenticated']) r
         WHERE f.pronamespace = 'public'::regnamespace
         AND has_function_privilege(r, f.oid, 'EXECUTE'));"
}

client_default_grants() {
    pgq -d "$DB" -c "SELECT count(DISTINCT (d.defaclobjtype, a.grantee)) FROM pg_default_acl d, aclexplode(d.defaclacl) a
        WHERE d.defaclnamespace = 'public'::regnamespace
        AND pg_get_userbyid(d.defaclrole) = 'postgres'
        AND pg_get_userbyid(a.grantee) IN ('anon','authenticated');"
}

as_role() {
    pgq -d "$DB" -v VERBOSITY=sqlstate -c "BEGIN" -c "SET LOCAL ROLE $1" -c "$2" -c "ROLLBACK" 2>&1
}

denied() {
    local out; out=$(as_role "$1" "$2")
    [[ "$out" == *"42501"* ]]
}

supabase_like() {
    pg -d "$1" <<'SQL' || fail "role setup in $1"
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
SQL
}

load_snapshot() {
    createdb -h "$WORK" -U postgres "$1" || fail "createdb $1"
    supabase_like "$1"
    pg -d "$1" -f "$SNAPSHOT" >"$WORK/$1.log" 2>&1 || { tail -20 "$WORK/$1.log"; fail "TableSchema.sql does not load"; }
}

schema_dump() {
    pg_dump -h "$WORK" -U postgres --schema-only "$1" >"$WORK/$1.dump" || fail "pg_dump $1"
    grep -q "CREATE TABLE public.species_en" "$WORK/$1.dump" || fail "pg_dump $1 has no species_en table"
    grep -v -E '^\\(restrict|unrestrict) ' "$WORK/$1.dump" >"$WORK/$1.schema"
}

check_001() {
    local before; before=$(fingerprint)
    step "001 - apply"
    apply "$MIG/001_add_definition_and_storage_version.sql"
    [ "$(target_columns)" = "3" ] || fail "expected 3 target columns after 001"
    ok "all 3 columns created"

    [ "$(pgq -d "$DB" -c "SELECT count(*) FROM media WHERE storage_version IS DISTINCT FROM 1;")" = "0" ] \
        || fail "media rows did not backfill to storage_version = 1"
    [ "$(pgq -d "$DB" -c "SELECT count(*) FROM species_en WHERE definition IS NOT NULL;")" = "0" ] \
        || fail "definition is not NULL on existing rows"
    ok "existing rows backfilled: storage_version = 1, definition NULL"

    apply "$MIG/001_add_definition_and_storage_version.sql"
    [ "$(target_columns)" = "3" ] || fail "re-apply changed the column count"
    ok "re-apply is a no-op"

    pg -d "$DB" -c "UPDATE species_en SET definition = 'A large deciduous timber tree.' WHERE species_id = 1;" \
        || fail "write to definition"
    [ "$(pgq -d "$DB" -c "SELECT definition FROM species_en WHERE species_id = 1;")" = "A large deciduous timber tree." ] \
        || fail "definition did not keep the written value"
    pg -d "$DB" -c "UPDATE media SET storage_version = storage_version + 1 WHERE media_id = 1;" \
        || fail "increment storage_version"
    [ "$(pgq -d "$DB" -c "SELECT storage_version FROM media WHERE media_id = 1;")" = "2" ] \
        || fail "storage_version did not increment to 2"
    ok "definition is writable and storage_version increments"

    local out; out=$(pg -d "$DB" -v VERBOSITY=verbose -c "INSERT INTO media (species_id, species_name, media_type, download_link, storage_version) VALUES (2, 'x', 'image', 'https://e.org/b.jpg', NULL);" 2>&1)
    [[ "$out" == *23502* && "$out" == *storage_version* ]] || fail "storage_version accepted NULL or failed for another reason: $out"
    ok "storage_version rejects NULL"

    step "001 - rollback"
    apply "$MIG/001_add_definition_and_storage_version.rollback.sql"
    [ "$(target_columns)" = "0" ] || fail "rollback left target columns"
    apply "$MIG/001_add_definition_and_storage_version.rollback.sql"
    same_rows_as "$before" || fail "rows differ from the state before 001"
    ok "rollback removes the columns, is a no-op on re-run and restores every row exactly"

    apply "$MIG/001_add_definition_and_storage_version.sql"
    ok "re-applied for the next migration"
}

check_002() {
    local before; before=$(fingerprint)
    step "002 - apply"
    apply "$MIG/002_enable_rls_and_revoke_client_roles.sql"
    for t in $TABLES; do
        [ "$(rls_on "$t")" = "t" ] || fail "RLS is off on $t"
    done
    ok "RLS on for all 8 tables"
    [ "$(client_access)" = "0" ] || fail "anon or authenticated keeps table privileges"
    ok "anon and authenticated have no table privileges"
    [ "$(client_default_grants)" = "0" ] || fail "postgres default privileges still grant to anon or authenticated"
    ok "new tables from postgres grant nothing to anon or authenticated"

    denied anon "SELECT password_hash FROM users" || fail "anon can read users"
    denied authenticated "SELECT access_token FROM admin_sessions" || fail "authenticated can read admin_sessions"
    denied anon "INSERT INTO changelog (version, entity_type, operation) VALUES (1, 'species', 'CREATE')" \
        || fail "anon can insert into changelog"
    ok "anon and authenticated get permission denied"

    [ "$(pgq -d "$DB" -c "BEGIN" -c "GRANT SELECT ON users TO anon" -c "SET LOCAL ROLE anon" -c "SELECT count(*) FROM users" -c "ROLLBACK")" = "0" ] \
        || fail "RLS alone does not hide users rows from anon"
    ok "RLS alone hides every row from anon, even with a grant"

    local svc; svc=$(as_role service_role "SELECT count(*) FROM users")
    [ "$svc" = "$(pgq -d "$DB" -c "SELECT count(*) FROM users;")" ] || fail "service_role sees $svc users"
    local out; out=$(as_role service_role "INSERT INTO changelog (version, entity_type, operation) VALUES (1, 'species', 'CREATE')")
    [[ "$out" == *ERROR* ]] && fail "service_role cannot insert: $out"
    ok "service_role reads every row and can write"

    apply "$MIG/002_enable_rls_and_revoke_client_roles.sql"
    [ "$(client_access)" = "0" ] || fail "re-apply changed privileges"
    ok "re-apply is a no-op"

    step "002 - rollback"
    apply "$MIG/002_enable_rls_and_revoke_client_roles.rollback.sql"
    apply "$MIG/002_enable_rls_and_revoke_client_roles.rollback.sql"
    assert_before_002
    same_rows_as "$before" || fail "rows differ from the state before 002"
    ok "rollback restores the old access, is a no-op on re-run and restores every row exactly"

    apply "$MIG/002_enable_rls_and_revoke_client_roles.sql"
    ok "re-applied"
}

assert_before_002() {
    for t in $TABLES_RLS_BEFORE_002; do
        [ "$(rls_on "$t")" = "f" ] || fail "RLS is on for $t before 002"
    done
    [ "$(rls_on admin_session_audit)" = "t" ] || fail "admin_session_audit lost RLS"
    local tables; tables=$(wc -w <<< "$TABLES")
    [ "$(client_full_access)" = "$((2 * tables))" ] || fail "anon and authenticated lack full table privileges before 002"
    [ "$(client_default_grants)" = "6" ] || fail "postgres default privileges do not grant tables, sequences and functions to both client roles before 002"
    ok "before 002: RLS only on admin_session_audit, client roles hold every grant"
}

step "STEP 0 - throwaway PostgreSQL $(pg_ctl --version | awk '{print $3}') on a private socket"
initdb -D "$WORK/pgdata" -U postgres --auth=trust >/dev/null 2>&1 || fail "initdb"
pg_ctl -D "$WORK/pgdata" \
    -o "-c listen_addresses='' -c unix_socket_directories=$WORK" \
    -l "$WORK/pg.log" start >/dev/null 2>&1 || { tail -20 "$WORK/pg.log"; fail "could not start postgres"; }
for _ in $(seq 20); do pgq -d postgres -c "SELECT 1" >/dev/null 2>&1 && break; sleep 0.5; done
pgq -d postgres -c "SELECT 1" >/dev/null 2>&1 || fail "cannot connect"
pg -d postgres -c "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;" \
    || fail "create Supabase roles"
ok "cluster up with anon, authenticated and service_role"

step "STEP 1 - load TableSchema.sql"
load_snapshot "$DB"
ok "$(pgq -d "$DB" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';") tables"

step "STEP 2 - roll back every migration to reach the pre-migration baseline"
ROLLBACKS=("$MIG"/[0-9][0-9][0-9]_*.rollback.sql)
for ((i = ${#ROLLBACKS[@]} - 1; i >= 0; i--)); do
    apply "${ROLLBACKS[i]}"
    ok "rolled back $(basename "${ROLLBACKS[i]}")"
done
[ "$(target_columns)" = "0" ] || fail "001 columns present at the baseline"
assert_before_002
ok "baseline has no 001 columns"

step "STEP 3 - seed representative rows"
pg -d "$DB" >"$WORK/rows.log" 2>&1 <<'SQL' || { tail -20 "$WORK/rows.log"; fail "seeding rows"; }
INSERT INTO public.species_en (species_id, scientific_name, common_name, habitat, leaf_type, fruit_type)
VALUES (1,'Tectona grandis','Ai-teak','lowland','simple','drupe'),
       (2,'Casuarina equisetifolia','Ai-kamii','coastal','needle','samara');
INSERT INTO public.species_tet (species_id, scientific_name, common_name, habitat, leaf_type, fruit_type)
VALUES (1,'Tectona grandis','Ai-teak','rai-kraik','simples','drupe'),
       (2,'Casuarina equisetifolia','Ai-kamii','tasi-ibun','agulla','samara');
INSERT INTO public.media (species_id, species_name, media_type, download_link)
VALUES (1,'Tectona grandis','video','https://example.org/a.mp4'),
       (1,'Tectona grandis','image','https://example.org/a.jpg');
INSERT INTO public.users (name, password_hash, role) VALUES ('admin', 'x', 'admin');
INSERT INTO public.admin_sessions (user_id, access_token, expires_at)
VALUES (1, 'token', now() + interval '1 hour');
INSERT INTO public.admin_session_audit (session_id, user_id, event_type) VALUES (1, 1, 'login');
INSERT INTO public.analytics (user_id, login_time, duration) VALUES (1, now(), 60);
INSERT INTO public.changelog (version, entity_id, entity_type, operation) VALUES (1, 1, 'species', 'CREATE');
SQL
EMPTY=$(pgq -d "$DB" -c "SELECT string_agg(relname, ', ') FROM pg_class c
    WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'p')
    AND NOT (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM public.%I', relname), false, true, '')))[1]::text::int > 0;")
[ -z "$EMPTY" ] || fail "seed left tables empty: $EMPTY"
ok "every public table has seed rows"

for f in "$MIG"/[0-9][0-9][0-9]_*.sql; do
    [[ "$f" == *.rollback.sql ]] && continue
    n=$(basename "$f" | cut -c1-3)
    declare -F "check_$n" >/dev/null || fail "no checks for migration $n in test_migration.sh"
    "check_$n"
done

step "STEP 4 - anon and authenticated have no access in schema public"
[ "$(client_access)" = "0" ] || fail "anon or authenticated holds a privilege on a public relation"
[ "$(client_sequence_and_function_access)" = "0" ] || fail "anon or authenticated can use a public sequence or function"
ok "no public relation, sequence or function is open to anon or authenticated"

step "STEP 5 - TableSchema.sql matches the migration chain"
load_snapshot "$SNAPDB"
schema_dump "$SNAPDB"
schema_dump "$DB"
if ! diff "$WORK/$SNAPDB.schema" "$WORK/$DB.schema" >"$WORK/schema.diff"; then
    head -40 "$WORK/schema.diff"
    fail "TableSchema.sql and the migration chain build different schemas"
fi
ok "pg_dump --schema-only is identical"

echo
echo "ALL MIGRATION CHECKS PASSED"
