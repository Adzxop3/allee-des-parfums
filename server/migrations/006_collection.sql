-- Parfumothèque : les parfums que chaque utilisateur possède, veut ou a testés.

CREATE TABLE IF NOT EXISTS collection_items (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  perfume_id INTEGER NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('owned', 'wishlist', 'tested')),
  rating     SMALLINT CHECK (rating BETWEEN 1 AND 5), -- note de 1 à 5, facultative
  note_perso TEXT CHECK (length(note_perso) <= 1000), -- commentaire personnel, facultatif
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- un parfum n'apparaît qu'une fois par collection (avec un seul statut)
  PRIMARY KEY (user_id, perfume_id)
);

-- Lister une collection par statut
CREATE INDEX IF NOT EXISTS collection_items_user_status_idx ON collection_items (user_id, status);
