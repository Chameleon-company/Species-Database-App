-- =============================================================================
-- Migration 002: enable RLS and revoke client-role access in schema public
-- =============================================================================
-- Created: 2026-11-14
--
-- Effect:
--   - RLS on for all 8 public tables, with no policies.
--   - anon and authenticated lose every privilege on every table, view,
--     sequence and function in public. PUBLIC loses EXECUTE on every existing
--     function in public.
--   - The postgres default privileges in public stop granting new tables,
--     sequences and functions to anon and authenticated.
--   - service_role keeps its grants and has BYPASSRLS.
--
-- Limits:
--   - PUBLIC still gets EXECUTE on functions created later. Each new function
--     needs its own REVOKE EXECUTE ... FROM PUBLIC.
--   - Default privileges of supabase_admin stay as they are.
--
-- Idempotent. See README.md, "Applying 002".
-- =============================================================================

BEGIN;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.species_en ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.species_tet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_session_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

COMMIT;
