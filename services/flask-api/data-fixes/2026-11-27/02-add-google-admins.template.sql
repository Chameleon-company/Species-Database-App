-- =============================================================================
-- Let Google accounts sign in to the admin dashboard (template)
-- =============================================================================
-- Why: "Sign in with Google" on the dashboard returned 403. The API verifies the
-- Google token, then looks for a users row whose name equals the Google email
-- with role 'admin'. Production had none for these accounts.
--
-- What it does, in one transaction:
--   - For each email: if a users row with that name exists (any case), makes it
--     an active admin that signs in with Google; otherwise inserts one.
--   - No password is set. These accounts sign in with Google only.
--   - Lists every admin afterwards, so you can see who else has access.
-- Safe to run more than once.
-- Replace the example addresses below with the lower-case Google emails of the
-- people who should be admins, then run it in the Supabase SQL editor of project
-- oppcngtkhywxsazeqqet.
-- =============================================================================

BEGIN;

CREATE TEMP TABLE new_admins (email text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO new_admins VALUES
    ('first.admin@example.org'),
    ('second.admin@example.org');

-- The API matches name exactly, so store the lower-case email as the name.
UPDATE public.users u
SET name = a.email,
    role = 'admin',
    is_active = TRUE,
    auth_provider = 'google',
    updated_at = CURRENT_TIMESTAMP
FROM new_admins a
WHERE lower(btrim(u.name)) = a.email;

INSERT INTO public.users (name, password_hash, role, is_active, auth_provider)
SELECT a.email, NULL, 'admin', TRUE, 'google'
FROM new_admins a
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE lower(btrim(u.name)) = a.email);

DO $$
DECLARE
    ok int;
BEGIN
    SELECT count(*) INTO ok FROM public.users u JOIN new_admins a ON u.name = a.email
    WHERE u.role = 'admin' AND u.is_active;
    IF ok <> (SELECT count(*) FROM new_admins) THEN
        RAISE EXCEPTION 'Admin setup check failed: % of % accounts are active admins', ok, (SELECT count(*) FROM new_admins);
    END IF;
END $$;

COMMIT;

-- Everyone who can sign in to the admin dashboard now:
SELECT user_id, name, auth_provider, is_active, (password_hash IS NOT NULL) AS has_password
FROM public.users
WHERE role = 'admin'
ORDER BY user_id;
