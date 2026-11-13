-- =============================================================================
-- Migration 003: merge orphan Tetum rows and require an English row
-- =============================================================================
-- Created: 2026-11-14
--
-- An orphan is a species_tet row with no species_en row of the same id.
-- Its partner is the species_tet row with the same scientific_name and an
-- English row.
--
-- Effect:
--   - Creates public.species_tet_s07_backup with RLS on and no client grants.
--   - Copies every orphan and every partner into the backup, as they were.
--     merged_into holds the partner id of each orphan and is NULL for a partner.
--   - Copies every column except species_id from each orphan onto its partner.
--   - Deletes the orphans.
--   - Logs UPDATE for each partner and DELETE for each orphan in changelog.
--   - Adds species_tet_species_id_fkey from species_tet.species_id to
--     species_en.species_id, ON DELETE CASCADE.
--
-- Raises an exception and changes nothing in these cases:
--   - An orphan has no partner.
--   - An orphan has more than one partner.
--   - Two orphans share a partner.
-- With no orphans, only the backup table and the foreign key are created.
-- Idempotent. Deploy the bulk-upload change first. See README.md, "Applying 003".
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.species_tet_s07_backup (
    LIKE public.species_tet,
    merged_into INT,
    PRIMARY KEY (species_id)
);
ALTER TABLE public.species_tet_s07_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.species_tet_s07_backup FROM anon, authenticated;

DO $$
DECLARE
    orphans integer;
BEGIN
    SELECT count(*) INTO orphans
    FROM public.species_tet t
    WHERE NOT EXISTS (SELECT 1 FROM public.species_en e WHERE e.species_id = t.species_id);

    IF orphans = 0 THEN
        RETURN;
    END IF;

    LOCK TABLE public.changelog IN EXCLUSIVE MODE;

    CREATE TEMP TABLE s07_pairs ON COMMIT DROP AS
    SELECT o.species_id AS orphan_id, k.species_id AS keep_id
    FROM public.species_tet o
    JOIN public.species_tet k
        ON k.scientific_name = o.scientific_name
       AND EXISTS (SELECT 1 FROM public.species_en e WHERE e.species_id = k.species_id)
    WHERE NOT EXISTS (SELECT 1 FROM public.species_en e WHERE e.species_id = o.species_id);

    IF (SELECT count(*) FROM s07_pairs) <> orphans
       OR (SELECT count(DISTINCT orphan_id) FROM s07_pairs) <> orphans
       OR (SELECT count(DISTINCT keep_id) FROM s07_pairs) <> orphans THEN
        RAISE EXCEPTION '003: % orphan species_tet rows do not each match exactly one partner', orphans;
    END IF;

    INSERT INTO public.species_tet_s07_backup (
        species_id, scientific_name, common_name, etymology, habitat,
        identification_character, leaf_type, fruit_type, phenology,
        seed_germination, pest, definition, merged_into)
    SELECT t.species_id, t.scientific_name, t.common_name, t.etymology, t.habitat,
           t.identification_character, t.leaf_type, t.fruit_type, t.phenology,
           t.seed_germination, t.pest, t.definition, p.keep_id
    FROM public.species_tet t
    LEFT JOIN s07_pairs p ON p.orphan_id = t.species_id
    WHERE t.species_id IN (SELECT orphan_id FROM s07_pairs UNION SELECT keep_id FROM s07_pairs)
    ON CONFLICT (species_id) DO NOTHING;

    UPDATE public.species_tet k
    SET scientific_name = o.scientific_name,
        common_name = o.common_name,
        etymology = o.etymology,
        habitat = o.habitat,
        identification_character = o.identification_character,
        leaf_type = o.leaf_type,
        fruit_type = o.fruit_type,
        phenology = o.phenology,
        seed_germination = o.seed_germination,
        pest = o.pest,
        definition = o.definition
    FROM s07_pairs p
    JOIN public.species_tet o ON o.species_id = p.orphan_id
    WHERE k.species_id = p.keep_id;

    DELETE FROM public.species_tet
    WHERE species_id IN (SELECT orphan_id FROM s07_pairs);

    INSERT INTO public.changelog (version, entity_id, entity_type, operation)
    SELECT (SELECT coalesce(max(version), 0) FROM public.changelog)
               + row_number() OVER (ORDER BY c.operation DESC, c.entity_id),
           c.entity_id, 'species', c.operation
    FROM (
        SELECT keep_id AS entity_id, 'UPDATE' AS operation FROM s07_pairs
        UNION ALL
        SELECT orphan_id, 'DELETE' FROM s07_pairs
    ) c;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'species_tet_species_id_fkey'
          AND conrelid = 'public.species_tet'::regclass
    ) THEN
        ALTER TABLE public.species_tet
            ADD CONSTRAINT species_tet_species_id_fkey
            FOREIGN KEY (species_id) REFERENCES public.species_en(species_id)
            ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
