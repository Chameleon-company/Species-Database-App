-- =============================================================================
-- Migration 002: enable RLS and revoke client-role access on every public table
-- =============================================================================
-- Created: 2026-11-14
--
-- Effect:
--   - RLS on for all 8 public tables, with no policies.
--   - anon and authenticated lose every privilege on those tables and on the
--     public sequences.
--   - Tables, sequences and functions that postgres creates later in public
--     no longer grant anything to anon or authenticated.
--   - service_role keeps its grants and has BYPASSRLS, so the Flask API is
--     unaffected.
--
-- Idempotent. See README.md for the reason and the apply order.
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

REVOKE ALL ON TABLE
    public.users,
    public.species_en,
    public.species_tet,
    public.changelog,
    public.analytics,
    public.media,
    public.admin_sessions,
    public.admin_session_audit
FROM anon, authenticated;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

COMMIT;
