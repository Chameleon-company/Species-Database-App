CREATE TABLE changelog (
  change_id SERIAL PRIMARY KEY,
  version INT NOT NULL,
  species_id UUID REFERENCES species(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  operation TEXT CHECK (operation IN ('create', 'update', 'delete')),
  payload JSONB,
  created_at TIMESTAMP DEFAULT now()
);
