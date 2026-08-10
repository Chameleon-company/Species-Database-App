-- =============================================================================
-- Migration 001: add species definition fields and media storage versioning
-- =============================================================================
-- Author:   Byron Ehrhardt (s224341683), Backend Lead
-- Created:  2026-07-27
-- Restores: PR #205 (species_en.definition, species_tet.definition)
--           PR #204 (media.storage_version)
--
-- CONTEXT
--   These three columns are declared in backend/TableSchema.sql on the
--   `backend` branch, and the application code on that branch reads and writes
--   them. They do not exist on `master`, and they do not exist in the live
--   Supabase database. The feature branch was never merged to master, so
--   neither the code nor the schema change ever reached a deployed database.
--
--   This migration is ADDITIVE and BACKWARD COMPATIBLE. It is safe to apply
--   before the code is merged: master-branch code does not reference these
--   columns and will ignore them.
--
-- ORDER OF OPERATIONS (important)
--   1. Apply this migration to the target database.
--   2. Then merge the code that uses the columns.
--   Doing it in the other order breaks every read/write of these fields.
--
-- IDEMPOTENT
--   Uses IF NOT EXISTS throughout. Safe to run more than once.
-- =============================================================================

BEGIN;

-- --- PR #205: bilingual species definition ------------------------------------
-- Nullable by design: existing rows have no definition text yet, and the field
-- is optional content rather than a required attribute.
-- NOTE: species_en and species_tet are a bilingual pair joined on species_id.
-- Any new species field MUST be added to BOTH tables or the two languages
-- silently drift apart.

ALTER TABLE public.species_en
    ADD COLUMN IF NOT EXISTS definition VARCHAR(2000);

ALTER TABLE public.species_tet
    ADD COLUMN IF NOT EXISTS definition VARCHAR(2000);

-- --- PR #204: media storage versioning ----------------------------------------
-- Drives offline sync: devices re-download a media file only when this counter
-- changes, instead of re-pulling the whole media set. Existing rows backfill to
-- version 1, which is correct. Their current stored file IS the first version.
-- NOT NULL + DEFAULT is a metadata-only change in PostgreSQL 11+, so this does
-- not rewrite the table.

ALTER TABLE public.media
    ADD COLUMN IF NOT EXISTS storage_version INTEGER NOT NULL DEFAULT 1;

COMMIT;

-- =============================================================================
-- VERIFICATION: run after applying, all three rows should return 't'
-- =============================================================================
-- SELECT
--     to_regclass('public.species_en')  IS NOT NULL
--     AND EXISTS (SELECT 1 FROM information_schema.columns
--                 WHERE table_schema='public' AND table_name='species_en'
--                   AND column_name='definition')       AS species_en_ok,
--     EXISTS (SELECT 1 FROM information_schema.columns
--                 WHERE table_schema='public' AND table_name='species_tet'
--                   AND column_name='definition')       AS species_tet_ok,
--     EXISTS (SELECT 1 FROM information_schema.columns
--                 WHERE table_schema='public' AND table_name='media'
--                   AND column_name='storage_version')  AS media_ok;
