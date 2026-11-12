CREATE TABLE species (
  id UUID PRIMARY KEY,
  language TEXT NOT NULL,
  scientific_name TEXT,
  common_name TEXT,
  etymology TEXT,
  habitat TEXT,
  identification_characters TEXT,
  leaf_type TEXT,
  fruit_type TEXT,
  phenology TEXT,
  seed_germination TEXT,
  pest TEXT,
  image_urls JSONB[],
  video_urls JSONB[]
);
