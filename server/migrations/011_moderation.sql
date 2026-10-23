-- Signalements et modération.

-- Rôle : 'admin' donne accès à la modération. Attribué uniquement en ligne de commande
-- (npm run make-admin -- email), jamais depuis le site.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Signalement d'un avis ou d'un commentaire. Supprimé avec le compte de son auteur.
CREATE TABLE IF NOT EXISTS reports (
  id          SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('review', 'comment')),
  target_id   INTEGER NOT NULL,
  reason      TEXT NOT NULL CHECK (reason IN ('spam', 'abuse', 'off_topic', 'other')),
  details     TEXT CHECK (char_length(details) <= 500), -- précision facultative
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved    BOOLEAN NOT NULL DEFAULT false
);
-- Un seul signalement en attente par membre et par contenu
CREATE UNIQUE INDEX IF NOT EXISTS reports_open_unique_idx
  ON reports (reporter_id, target_type, target_id) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS reports_target_idx ON reports (target_type, target_id);

-- Journal des décisions de modération. Conservé même si l'admin supprime son compte (admin_id → NULL).
-- excerpt : début du contenu traité, pour garder une trace même après une suppression.
CREATE TABLE IF NOT EXISTS moderation_log (
  id          SERIAL PRIMARY KEY,
  admin_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('review', 'comment')),
  target_id   INTEGER NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('hide', 'delete', 'ignore')),
  excerpt     TEXT,
  note        TEXT CHECK (char_length(note) <= 500),
  reports     INTEGER NOT NULL DEFAULT 0, -- nombre de signalements clos par cette décision
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
