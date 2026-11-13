-- =============================================================================
-- ROLLBACK for migration 002: enable RLS and revoke client-role access
-- =============================================================================
-- Created: 2026-11-14
--
-- WARNING: this restores the insecure state.
--   The anon key can then read and write the 8 public tables again, including
--   users.password_hash and admin_sessions.access_token.
--   Only the project owner runs it, and only to undo a failed apply.
--
-- Restores the state recorded on dev on 2026-11-14 (README.md, "Applying
-- 002").
--   - RLS stays on for admin_session_audit only.
--   - anon and authenticated get ALL on the 8 named tables.
--   - anon and authenticated get ALL on every public sequence.
--   - The postgres default privileges in public grant to them again.
-- A table created after 002 stays closed. A sequence created after 002 opens
-- again. A sequence holds no rows. Public had no functions on 2026-11-14.
-- The rollback grants EXECUTE on no function.
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
