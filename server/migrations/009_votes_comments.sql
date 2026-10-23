-- Votes « utile » sur les avis et commentaires en réponse à un avis.
-- Supprimés avec le compte de leur auteur et avec l'avis concerné.

-- Un vote par membre et par avis (la règle « pas sur son propre avis » est vérifiée par l'API)
CREATE TABLE IF NOT EXISTS review_votes (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_id  INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, review_id)
);
CREATE INDEX IF NOT EXISTS review_votes_review_idx ON review_votes (review_id);

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_id  INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 2 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 'hidden' : masqué par la modération (invisible publiquement, mais conservé)
  status     TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden'))
);
CREATE INDEX IF NOT EXISTS comments_review_idx ON comments (review_id, created_at);
