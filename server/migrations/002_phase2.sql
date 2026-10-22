-- Phase 2 : popularité, poids des notes, familles olfactives.

-- Popularité (nombre de votants Fragrantica) et note moyenne sur 5
ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS rating_avg   REAL;
CREATE INDEX IF NOT EXISTS perfumes_rating_count_idx ON perfumes (rating_count DESC, id);

-- Importance de la note dans le parfum (0 à 100)
ALTER TABLE perfume_notes ADD COLUMN IF NOT EXISTS weight SMALLINT;

-- Famille olfactive de chaque accord (clé : citrus, woody...)
ALTER TABLE accords ADD COLUMN IF NOT EXISTS family TEXT;

-- Nombre de parfums par note, calculé à la fin de l'import
ALTER TABLE notes ADD COLUMN IF NOT EXISTS perfume_count INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS notes_perfume_count_idx ON notes (perfume_count DESC);
