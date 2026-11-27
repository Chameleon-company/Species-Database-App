-- Rollback for 01-load-tetum-translation-20261127.sql
-- Restores species_tet exactly as it was before the load (including the 5 duplicate
-- rows), and logs an UPDATE for every restored species so installed apps re-sync.
BEGIN;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.species_tet_backup_20261127) THEN
        RAISE EXCEPTION 'No backup rows in species_tet_backup_20261127; nothing to restore';
    END IF;
END $$;
DELETE FROM public.species_tet;
INSERT INTO public.species_tet SELECT * FROM public.species_tet_backup_20261127;
LOCK TABLE public.changelog IN EXCLUSIVE MODE;
INSERT INTO public.changelog (version, entity_id, entity_type, operation)
SELECT base.v + 1, NULL, 'species', 'RESTORE_TETUM_20261127'
FROM (SELECT coalesce(max(version), 0) AS v FROM public.changelog) base;
COMMIT;
