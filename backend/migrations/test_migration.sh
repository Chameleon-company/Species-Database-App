#!/usr/bin/env bash
# =============================================================================
# Migration 001 verification harness
# =============================================================================
# Author: Byron Ehrhardt (s224341683) - Backend Lead
#
# Runs the checklist from README.md against a THROWAWAY local PostgreSQL
# database. It never connects to Supabase and never reads backend/.env, so it
# cannot touch the shared project.
#
# What it proves:
#   - the migration applies to a database shaped like the CURRENT live one
#   - existing rows backfill correctly
#   - it is idempotent (safe to re-run when you are unsure whether it ran)
#   - the new columns actually work the way the feature code needs
#   - the rollback fully reverses it, and is itself idempotent
#   - no data is lost across apply -> rollback
#   - TableSchema.sql still builds a correct database from scratch
#
# Requires: postgresql client + server binaries (psql, initdb, pg_ctl) and git.
#   macOS:  brew install postgresql@14
#   Ubuntu: sudo apt install postgresql
#
# Usage:
#   bash backend/migrations/test_migration.sh
#   BASE_REF=origin/master bash backend/migrations/test_migration.sh
# =============================================================================
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIG="$REPO/backend/migrations"
WORK="${TMPDIR:-/tmp}/sda-migration-test.$$"
PGPORT_TEST="${PGPORT_TEST:-5599}"
# The branch whose schema represents the CURRENTLY DEPLOYED database.
BASE_REF="${BASE_REF:-upstream/master}"
DB=sda_mig_test
SNAPDB=sda_snapshot_test

# postgres server binaries are not always on PATH even when psql is
for d in /opt/homebrew/opt/postgresql@*/bin /usr/lib/postgresql/*/bin \
         /usr/local/opt/postgresql@*/bin; do
    [ -x "$d/initdb" ] && export PATH="$d:$PATH" && break
done

fail() { echo "!! FAIL: $*"; cleanup; exit 1; }
ok()   { echo "   ok: $*"; }

cleanup() {
    if [ -d "$WORK/pgdata" ]; then
        pg_ctl -D "$WORK/pgdata" stop -m immediate >/dev/null 2>&1
    fi
    rm -rf "$WORK"
}
trap cleanup EXIT

for bin in psql initdb pg_ctl createdb dropdb git; do
    command -v "$bin" >/dev/null 2>&1 || fail "$bin not found on PATH"
done

pg()  { psql -h 127.0.0.1 -p "$PGPORT_TEST" -U postgres -v ON_ERROR_STOP=1 "$@"; }
pgq() { psql -h 127.0.0.1 -p "$PGPORT_TEST" -U postgres -tAq "$@"; }

# --- throwaway cluster -------------------------------------------------------
echo "=== STEP 0 - start throwaway PostgreSQL on port $PGPORT_TEST ============"
mkdir -p "$WORK"
initdb -D "$WORK/pgdata" -U postgres --auth=trust >/dev/null 2>&1 \
    || fail "initdb"
# TCP only: unix socket paths under TMPDIR can exceed the 103-byte limit
pg_ctl -D "$WORK/pgdata" \
    -o "-c listen_addresses=127.0.0.1 -p $PGPORT_TEST -c unix_socket_directories=''" \
    -l "$WORK/pg.log" start >/dev/null 2>&1 || {
        tail -20 "$WORK/pg.log"; fail "could not start postgres"; }
sleep 2
pgq -d postgres -c "select 1" >/dev/null 2>&1 || fail "cannot connect"
ok "cluster up (throwaway, removed on exit)"

createdb -h 127.0.0.1 -p "$PGPORT_TEST" -U postgres "$DB" || fail "createdb"

echo
echo "=== STEP 1 - seed scratch DB with $BASE_REF schema ======================"
cd "$REPO" || fail "cd repo"
git rev-parse --verify "$BASE_REF" >/dev/null 2>&1 \
    || fail "ref '$BASE_REF' not found (try: git fetch upstream)"
if ! git show "$BASE_REF:backend/TableSchema.sql" | pg -d "$DB" -q >"$WORK/seed.log" 2>&1; then
    tail -20 "$WORK/seed.log"; fail "seeding $BASE_REF schema"
fi
ok "$BASE_REF schema loaded - $(pgq -d "$DB" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';") tables"

echo
echo "=== STEP 2 - confirm target columns ABSENT (reproduces live drift) ======"
PRE=$(pgq -d "$DB" -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('definition','storage_version');")
[ "$PRE" = "0" ] || fail "expected 0 target columns before migration, found $PRE"
ok "0 target columns - matches the live-database state"

echo
echo "=== STEP 3 - seed representative rows ==================================="
# an empty table will accept a migration that would fail against real rows
if ! pg -d "$DB" -q >"$WORK/rows.log" 2>&1 <<'SQL'
INSERT INTO public.species_en (species_id, scientific_name, common_name, habitat, leaf_type, fruit_type)
VALUES (1,'Tectona grandis','Ai-teak','lowland','simple','drupe'),
       (2,'Casuarina equisetifolia','Ai-kamii','coastal','needle','samara');
INSERT INTO public.species_tet (species_id, scientific_name, common_name, habitat, leaf_type, fruit_type)
VALUES (1,'Tectona grandis','Ai-teak','rai-kraik','simples','drupe'),
       (2,'Casuarina equisetifolia','Ai-kamii','tasi-ibun','agulla','samara');
INSERT INTO public.media (species_id, species_name, media_type, download_link)
VALUES (1,'Tectona grandis','video','https://example.org/a.mp4'),
       (1,'Tectona grandis','image','https://example.org/a.jpg');
SQL
then
    tail -20 "$WORK/rows.log"; fail "seeding representative rows"
fi
ROWS=$(pgq -d "$DB" -c "SELECT (SELECT count(*) FROM species_en)||'/'||(SELECT count(*) FROM species_tet)||'/'||(SELECT count(*) FROM media);")
[ "$ROWS" = "2/2/2" ] || fail "expected 2/2/2 seeded rows, got $ROWS"
ok "seeded species_en/species_tet/media = $ROWS"

echo
echo "=== STEP 4 - APPLY migration 001 ========================================"
pg -d "$DB" -q -f "$MIG/001_add_definition_and_storage_version.sql" >/dev/null 2>&1 \
    || fail "applying 001"
ok "migration applied"
echo
pg -d "$DB" -c "SELECT table_name, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns WHERE table_schema='public'
  AND column_name IN ('definition','storage_version') ORDER BY table_name, column_name;"
POST=$(pgq -d "$DB" -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('definition','storage_version');")
[ "$POST" = "3" ] || fail "expected 3 target columns, found $POST"
ok "all 3 columns created"

echo
echo "=== STEP 5 - existing rows backfilled correctly ========================="
BAD=$(pgq -d "$DB" -c "SELECT count(*) FROM media WHERE storage_version IS DISTINCT FROM 1;")
[ "$BAD" = "0" ] || fail "$BAD media rows did not backfill to storage_version=1"
ok "pre-existing media rows backfilled to storage_version = 1"
NOTNULL=$(pgq -d "$DB" -c "SELECT count(*) FROM species_en WHERE definition IS NOT NULL;")
[ "$NOTNULL" = "0" ] || fail "definition should be NULL on existing rows"
ok "definition NULL on existing rows (nullable, as designed)"

echo
echo "=== STEP 6 - IDEMPOTENCY: re-apply must be a clean no-op ================"
pg -d "$DB" -q -f "$MIG/001_add_definition_and_storage_version.sql" >/dev/null 2>&1 \
    || fail "re-apply was not idempotent"
AGAIN=$(pgq -d "$DB" -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('definition','storage_version');")
[ "$AGAIN" = "3" ] || fail "column count changed on re-apply: $AGAIN"
ok "re-apply succeeded, still 3 columns"

echo
echo "=== STEP 7 - the new columns actually work =============================="
pg -d "$DB" -q -c "UPDATE species_en SET definition='A large deciduous timber tree.' WHERE species_id=1;" >/dev/null 2>&1 \
    || fail "write to definition"
pg -d "$DB" -q -c "UPDATE media SET storage_version = storage_version + 1 WHERE media_id=1;" >/dev/null 2>&1 \
    || fail "increment storage_version"
V=$(pgq -d "$DB" -c "SELECT storage_version FROM media WHERE media_id=1;")
[ "$V" = "2" ] || fail "storage_version increment gave '$V', expected 2"
ok "definition writable; storage_version increments 1 -> 2 as offline sync needs"

echo
echo "=== STEP 8 - NOT NULL constraint enforced ==============================="
if pg -d "$DB" -q -c "INSERT INTO media (species_id, species_name, media_type, download_link, storage_version) VALUES (2,'x','image','https://e.org/b.jpg',NULL);" >/dev/null 2>&1; then
    fail "NULL accepted into storage_version - NOT NULL not enforced"
fi
ok "NULL rejected by storage_version NOT NULL constraint"

echo
echo "=== STEP 9 - ROLLBACK ==================================================="
pg -d "$DB" -q -f "$MIG/001_add_definition_and_storage_version.rollback.sql" >/dev/null 2>&1 \
    || fail "rollback failed"
BACK=$(pgq -d "$DB" -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('definition','storage_version');")
[ "$BACK" = "0" ] || fail "rollback left $BACK columns behind"
ok "rollback removed all 3 columns"

echo
echo "=== STEP 10 - rollback is idempotent ===================================="
pg -d "$DB" -q -f "$MIG/001_add_definition_and_storage_version.rollback.sql" >/dev/null 2>&1 \
    || fail "rollback not idempotent"
ok "re-running rollback is a clean no-op"

echo
echo "=== STEP 11 - data survived the round trip =============================="
SURV=$(pgq -d "$DB" -c "SELECT (SELECT count(*) FROM species_en)||'/'||(SELECT count(*) FROM species_tet)||'/'||(SELECT count(*) FROM media);")
[ "$SURV" = "$ROWS" ] || fail "row counts changed: $ROWS -> $SURV"
ok "row counts unchanged through apply+rollback ($SURV)"

echo
echo "=== STEP 12 - TableSchema.sql builds a correct DB from scratch =========="
createdb -h 127.0.0.1 -p "$PGPORT_TEST" -U postgres "$SNAPDB" || fail "createdb snapshot"
if ! pg -d "$SNAPDB" -q -f "$REPO/backend/TableSchema.sql" >"$WORK/snap.log" 2>&1; then
    tail -20 "$WORK/snap.log"; fail "TableSchema.sql does not load"
fi
SNAP=$(pgq -d "$SNAPDB" -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('definition','storage_version');")
[ "$SNAP" = "3" ] || fail "fresh DB from TableSchema.sql has $SNAP/3 target columns"
ok "fresh database has all 3 columns"
AUDIT=$(pgq -d "$SNAPDB" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_session_audit';")
[ "$AUDIT" = "1" ] || fail "admin_session_audit missing - master's auth schema regressed"
ok "admin_session_audit present - master's auth schema intact"

echo
echo "========================================================================="
echo "ALL MIGRATION CHECKS PASSED"
echo "========================================================================="
