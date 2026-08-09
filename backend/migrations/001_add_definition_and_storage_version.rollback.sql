-- =============================================================================
-- ROLLBACK for migration 001 — add definition fields and media storage version
-- =============================================================================
-- Author:  Byron Ehrhardt (s224341683) — Backend Lead
-- Created: 2026-07-27
--
-- ⚠️  DESTRUCTIVE — DATA LOSS
--   Dropping these columns permanently deletes every value stored in them:
--     * all English species definition text
--     * all Tetum species definition text
--     * every media storage_version counter
--
--   Losing storage_version has a second-order effect worth understanding before
--   you run this: offline devices use it to decide whether a cached media file
--   is stale. Dropping and later re-adding it resets every counter to 1, so
--   devices holding a newer cached file will believe they are up to date and
--   will not re-download replaced media.
--
-- BEFORE RUNNING
--   1. Roll back the CODE first. Application code on the `backend` branch reads
--      and writes these columns; dropping them under running code breaks it.
--      This is the exact reverse of the apply order.
--   2. Take a backup. Supabase → Database → Backups, or:
--        pg_dump --data-only -t public.species_en -t public.species_tet \
--                -t public.media > pre_rollback_backup.sql
--
-- WHEN YOU PROBABLY DON'T NEED THIS
--   Migration 001 is purely additive. If the code merge is reverted, these
--   columns become harmless unused columns — they cost nothing and break
--   nothing. Prefer leaving them in place over dropping real data.
-- =============================================================================

BEGIN;

ALTER TABLE public.media
    DROP COLUMN IF EXISTS storage_version;

ALTER TABLE public.species_tet
    DROP COLUMN IF EXISTS definition;

ALTER TABLE public.species_en
    DROP COLUMN IF EXISTS definition;

COMMIT;
