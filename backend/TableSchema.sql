--run this in supabase SQL editor to recreate the structure

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
    definition VARCHAR(2000)
);

-- migration: add definition to existing deployments
-- ALTER TABLE public.species_en ADD COLUMN IF NOT EXISTS definition VARCHAR(2000);
-- ALTER TABLE public.species_tet ADD COLUMN IF NOT EXISTS definition VARCHAR(2000);

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
    CONSTRAINT media_media_type_check
      CHECK (media_type IN ('image','video')),
    CONSTRAINT media_species_id_fkey
      FOREIGN KEY (species_id)
      REFERENCES public.species_en(species_id)
      ON DELETE CASCADE
);

--active admin login sessions
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    access_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT admin_sessions_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(user_id)
      ON DELETE CASCADE
);
