-- =============================================================================
-- ROLLBACK for migration 002: enable RLS and revoke client-role access
-- =============================================================================
-- Created: 2026-11-14
--
-- WARNING: this restores the insecure state.
--   The anon key can then read and write every public table again, including
--   users.password_hash and admin_sessions.access_token.
--   Run it only to undo a failed apply, and apply 002 again at once.
--
-- admin_session_audit keeps RLS on, because it had RLS on before 002.
-- Idempotent.
-- =============================================================================

BEGIN;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

GRANT ALL ON TABLE
    public.users,
    public.species_en,
    public.species_tet,
    public.changelog,
    public.analytics,
    public.media,
    public.admin_sessions,
    public.admin_session_audit
TO anon, authenticated;

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.species_en DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.species_tet DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.changelog DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.media DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions DISABLE ROW LEVEL SECURITY;

COMMIT;
