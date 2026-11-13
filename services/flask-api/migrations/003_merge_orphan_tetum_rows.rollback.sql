-- =============================================================================
-- ROLLBACK for migration 003: merge orphan Tetum rows
-- =============================================================================
-- Created: 2026-11-14
--
-- Effect:
--   - Drops species_tet_species_id_fkey.
--   - Restores every row in public.species_tet_s07_backup exactly: re-creates
--     the deleted orphans and puts the old values back on their partners.
--   - Writes one changelog row per restored row: CREATE for a row with no
--     English row, UPDATE for the others.
--   - Drops the backup table.
--
-- Run it before any new species_tet row takes an orphan's id, or the restore
-- of that orphan fails on the primary key.
-- Idempotent. With no backup table it only drops the foreign key.
-- =============================================================================

BEGIN;

ALTER TABLE public.species_tet DROP CONSTRAINT IF EXISTS species_tet_species_id_fkey;

DO $$
BEGIN
    IF to_regclass('public.species_tet_s07_backup') IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO public.changelog (version, entity_id, entity_type, operation)
    SELECT (SELECT coalesce(max(version), 0) FROM public.changelog)
               + row_number() OVER (ORDER BY b.species_id),
           b.species_id, 'species',
           CASE WHEN EXISTS (SELECT 1 FROM public.species_tet t WHERE t.species_id = b.species_id)
                THEN 'UPDATE' ELSE 'CREATE' END
    FROM public.species_tet_s07_backup b;

    UPDATE public.species_tet t
    SET scientific_name = b.scientific_name,
        common_name = b.common_name,
        etymology = b.etymology,
        habitat = b.habitat,
        identification_character = b.identification_character,
        leaf_type = b.leaf_type,
        fruit_type = b.fruit_type,
        phenology = b.phenology,
        seed_germination = b.seed_germination,
        pest = b.pest,
        definition = b.definition
    FROM public.species_tet_s07_backup b
    WHERE t.species_id = b.species_id;

    INSERT INTO public.species_tet
    SELECT b.*
    FROM public.species_tet_s07_backup b
    WHERE NOT EXISTS (SELECT 1 FROM public.species_tet t WHERE t.species_id = b.species_id);
END $$;

DROP TABLE IF EXISTS public.species_tet_s07_backup;

COMMIT;
