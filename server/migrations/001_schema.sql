-- Schéma initial de la base parfums.
-- Les "IF NOT EXISTS" permettent de relancer la migration sans erreur.

-- Recherche partielle rapide (ILIKE '%...%') sur les noms
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS brands (
  id      SERIAL PRIMARY KEY,
  name    TEXT NOT NULL UNIQUE,
  country TEXT
);

CREATE TABLE IF NOT EXISTS perfumers (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- id = identifiant Fragrantica du dataset (sert de clé pour réimporter sans doublon)
CREATE TABLE IF NOT EXISTS perfumes (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  brand_id      INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  year          SMALLINT,
  gender        TEXT,
  concentration TEXT,
  description   TEXT,
  image_url     TEXT
);

CREATE TABLE IF NOT EXISTS perfume_perfumers (
  perfume_id  INTEGER NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  perfumer_id INTEGER NOT NULL REFERENCES perfumers(id) ON DELETE CASCADE,
  PRIMARY KEY (perfume_id, perfumer_id)
);

CREATE TABLE IF NOT EXISTS notes (
  id     SERIAL PRIMARY KEY,
  name   TEXT NOT NULL UNIQUE,
  family TEXT
);

CREATE TABLE IF NOT EXISTS perfume_notes (
  perfume_id INTEGER NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  -- 'flat' : note sans pyramide (le parfum n'a pas de tête/cœur/fond)
  position   TEXT NOT NULL CHECK (position IN ('top', 'heart', 'base', 'flat')),
  PRIMARY KEY (perfume_id, note_id, position)
);

CREATE TABLE IF NOT EXISTS accords (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS perfume_accords (
  perfume_id INTEGER NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  accord_id  INTEGER NOT NULL REFERENCES accords(id) ON DELETE CASCADE,
  intensity  REAL,
  PRIMARY KEY (perfume_id, accord_id)
);

CREATE TABLE IF NOT EXISTS moods (
  id   SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('season', 'occasion', 'mood')),
  name TEXT NOT NULL,
  UNIQUE (type, name)
);

CREATE TABLE IF NOT EXISTS perfume_moods (
  perfume_id INTEGER NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  mood_id    INTEGER NOT NULL REFERENCES moods(id) ON DELETE CASCADE,
  score      REAL,
  PRIMARY KEY (perfume_id, mood_id)
);

-- Recherche par nom (parfums, marques, notes)
CREATE INDEX IF NOT EXISTS perfumes_name_trgm_idx ON perfumes USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS brands_name_trgm_idx   ON brands   USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS notes_name_trgm_idx    ON notes    USING GIN (name gin_trgm_ops);

-- Tri alphabétique des listes de parfums
CREATE INDEX IF NOT EXISTS perfumes_name_idx ON perfumes (name, id);

-- Filtres courants sur les parfums
CREATE INDEX IF NOT EXISTS perfumes_brand_id_idx ON perfumes (brand_id);
CREATE INDEX IF NOT EXISTS perfumes_year_idx     ON perfumes (year);
CREATE INDEX IF NOT EXISTS perfumes_gender_idx   ON perfumes (gender);
CREATE INDEX IF NOT EXISTS notes_family_idx      ON notes (family);

-- Recherches inverses (ex. : parfums d'une note). Le sens perfume_id -> ...
-- est déjà couvert par les clés primaires.
CREATE INDEX IF NOT EXISTS perfume_perfumers_perfumer_id_idx ON perfume_perfumers (perfumer_id);
CREATE INDEX IF NOT EXISTS perfume_notes_note_id_idx         ON perfume_notes (note_id, perfume_id);
CREATE INDEX IF NOT EXISTS perfume_accords_accord_id_idx     ON perfume_accords (accord_id);
CREATE INDEX IF NOT EXISTS perfume_moods_mood_id_idx         ON perfume_moods (mood_id);
