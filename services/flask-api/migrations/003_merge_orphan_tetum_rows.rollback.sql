-- =============================================================================
-- ROLLBACK for migration 003: merge orphan Tetum rows
-- =============================================================================
-- Created: 2026-11-14
--
-- Effect:
--   - Drops species_tet_species_id_fkey.
--   - Puts the old values back on each partner row.
--   - Re-creates each deleted orphan row.
--   - Logs UPDATE for each partner and CREATE for each orphan in changelog.
--   - Drops the backup table.
--
-- Raises an exception and changes nothing in these cases:
--   - A partner row differs from the orphan text that 003 copied onto it.
--     An edit after 003 would be lost.
--   - A species_tet row already uses an orphan id.
-- Idempotent. With no backup table, it only drops the foreign key.
-- =============================================================================

BEGIN;

ALTER TABLE public.species_tet DROP CONSTRAINT IF EXISTS species_tet_species_id_fkey;

DO $$
DECLARE
    edited text;
    taken text;
BEGIN
    IF to_regclass('public.species_tet_s07_backup') IS NULL THEN
        RETURN;
    END IF;

    LOCK TABLE public.changelog IN EXCLUSIVE MODE;

    SELECT string_agg(k.species_id::text, ', ') INTO edited
    FROM public.species_tet_s07_backup o
    JOIN public.species_tet k ON k.species_id = o.merged_into
    WHERE (k.scientific_name, k.common_name, k.etymology, k.habitat,
           k.identification_character, k.leaf_type, k.fruit_type, k.phenology,
           k.seed_germination, k.pest, k.definition)
          IS DISTINCT FROM
          (o.scientific_name, o.common_name, o.etymology, o.habitat,
           o.identification_character, o.leaf_type, o.fruit_type, o.phenology,
           o.seed_germination, o.pest, o.definition);
    IF edited IS NOT NULL THEN
        RAISE EXCEPTION '003 rollback: species_tet rows % changed after 003', edited;
    END IF;

    SELECT string_agg(t.species_id::text, ', ') INTO taken
    FROM public.species_tet_s07_backup o
    JOIN public.species_tet t ON t.species_id = o.species_id
    WHERE o.merged_into IS NOT NULL;
    IF taken IS NOT NULL THEN
        RAISE EXCEPTION '003 rollback: orphan ids % are in use again', taken;
    END IF;

    INSERT INTO public.changelog (version, entity_id, entity_type, operation)
    SELECT (SELECT coalesce(max(version), 0) FROM public.changelog)
               + row_number() OVER (ORDER BY b.species_id),
           b.species_id, 'species',
           CASE WHEN b.merged_into IS NULL THEN 'UPDATE' ELSE 'CREATE' END
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
    WHERE t.species_id = b.species_id
      AND b.merged_into IS NULL;

    INSERT INTO public.species_tet (
        species_id, scientific_name, common_name, etymology, habitat,
        identification_character, leaf_type, fruit_type, phenology,
        seed_germination, pest, definition)
    SELECT b.species_id, b.scientific_name, b.common_name, b.etymology, b.habitat,
           b.identification_character, b.leaf_type, b.fruit_type, b.phenology,
           b.seed_germination, b.pest, b.definition
    FROM public.species_tet_s07_backup b
    WHERE b.merged_into IS NOT NULL;
END $$;

DROP TABLE IF EXISTS public.species_tet_s07_backup;

COMMIT;
