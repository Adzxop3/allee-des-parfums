-- Phase 4 : avis des membres sur les parfums.
-- Les avis sont supprimés avec le compte de leur auteur (ON DELETE CASCADE).

CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  perfume_id INTEGER NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title      TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 100),
  body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 30 AND 3000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 'hidden' : masqué par la modération (invisible publiquement, mais conservé)
  status     TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  -- un seul avis par membre et par parfum
  UNIQUE (user_id, perfume_id)
);

-- Avis publiés d'un parfum, les plus récents d'abord
CREATE INDEX IF NOT EXISTS reviews_perfume_idx ON reviews (perfume_id, status, created_at DESC);
