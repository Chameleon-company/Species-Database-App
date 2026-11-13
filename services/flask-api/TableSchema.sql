-- Full schema snapshot. Run it in the Supabase SQL editor to build a new database.
-- It needs the Supabase roles anon, authenticated and service_role.
-- services/flask-api/migrations/test_migration.sh creates those roles to load it into plain PostgreSQL.

--users for admin login
CREATE TABLE IF NOT EXISTS public.users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255), -- null if using google login
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auth_provider TEXT NOT NULL DEFAULT 'local'
);

--species data (eng)
CREATE TABLE IF NOT EXISTS public.species_en (
    species_id SERIAL PRIMARY KEY,
    scientific_name VARCHAR(200) NOT NULL,
    common_name VARCHAR(100) NOT NULL,
    etymology VARCHAR(1000),
    habitat VARCHAR(500),
    identification_character VARCHAR(2000),
    leaf_type VARCHAR(225) NOT NULL,
    fruit_type VARCHAR(225) NOT NULL,
    phenology VARCHAR(1000),
    seed_germination VARCHAR(2000),
    pest VARCHAR(2000),
    definition VARCHAR(2000)
);

--species data (tet translation)
CREATE TABLE IF NOT EXISTS public.species_tet (
    species_id SERIAL PRIMARY KEY,
    scientific_name VARCHAR(200) NOT NULL,
    common_name VARCHAR(100) NOT NULL,
    etymology VARCHAR(1000),
    habitat VARCHAR(500),
    identification_character VARCHAR(2000),
    leaf_type VARCHAR(225) NOT NULL,
    fruit_type VARCHAR(225) NOT NULL,
    phenology VARCHAR(1000),
    seed_germination VARCHAR(2000),
    pest VARCHAR(2000),
    definition VARCHAR(2000),
    CONSTRAINT species_tet_species_id_fkey
      FOREIGN KEY (species_id)
      REFERENCES public.species_en(species_id)
      ON DELETE CASCADE
);

-- NOTE: species_en.definition / species_tet.definition are added to EXISTING
-- databases by services/flask-api/migrations/001_add_definition_and_storage_version.sql.
-- This file is the full-schema snapshot for creating a database from scratch;
-- it is not a change history. See services/flask-api/migrations/README.md.

--changelog used for incremental sync to devices
CREATE TABLE IF NOT EXISTS public.changelog (
    change_id SERIAL PRIMARY KEY,
    version INT NOT NULL,
    entity_id INT,
    entity_type VARCHAR(50) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--simple analytics for admin logins
CREATE TABLE IF NOT EXISTS public.analytics (
    event_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    login_time TIMESTAMP NOT NULL,
    duration INT NOT NULL,
    location VARCHAR(255),
    event_type VARCHAR(50) DEFAULT 'login',
    CONSTRAINT analytics_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(user_id)
      ON DELETE CASCADE
);

--images and videos linked to species
CREATE TABLE IF NOT EXISTS public.media (
    media_id SERIAL PRIMARY KEY,
    species_id INT NOT NULL,
    species_name TEXT NOT NULL,
    media_type TEXT,
    download_link TEXT NOT NULL,
    streaming_link TEXT,
    alt_text TEXT,
    storage_version INTEGER DEFAULT 1 NOT NULL,
    CONSTRAINT media_media_type_check
      CHECK (media_type IN ('image','video')),
    CONSTRAINT media_species_id_fkey
      FOREIGN KEY (species_id)
      REFERENCES public.species_en(species_id)
      ON DELETE CASCADE
);

-- NOTE: media.storage_version is added to EXISTING databases by
-- services/flask-api/migrations/001_add_definition_and_storage_version.sql.

--active admin login sessions
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    access_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    refresh_token_hash TEXT,
    refresh_expires_at TIMESTAMPTZ,
    last_activity TIMESTAMPTZ DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    revocation_reason TEXT,
    CONSTRAINT admin_sessions_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(user_id)
      ON DELETE CASCADE
);

--admin session audit history
CREATE TABLE IF NOT EXISTS public.admin_session_audit (
    audit_id SERIAL PRIMARY KEY,
    session_id INT,
    user_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_timestamp TIMESTAMPTZ DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    CONSTRAINT admin_session_audit_session_id_fkey
      FOREIGN KEY (session_id)
      REFERENCES public.admin_sessions(session_id)
      ON DELETE CASCADE,
    CONSTRAINT admin_session_audit_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(user_id)
      ON DELETE CASCADE
);

-- Backup of the species_tet rows that migration 003 changed. The 003 rollback
-- reads it. Existing databases get this from
-- services/flask-api/migrations/003_merge_orphan_tetum_rows.sql.
CREATE TABLE IF NOT EXISTS public.species_tet_s07_backup (
    LIKE public.species_tet,
    PRIMARY KEY (species_id)
);
ALTER TABLE public.species_tet_s07_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.species_tet_s07_backup FROM anon, authenticated;

-- Row level security and client-role access. Existing databases get this from
-- services/flask-api/migrations/002_enable_rls_and_revoke_client_roles.sql.
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
