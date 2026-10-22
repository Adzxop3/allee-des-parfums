-- Phase 3 : comptes utilisateurs et sessions de connexion.

-- L'email est enregistré en minuscules (normalisé par l'API) : l'unicité ne dépend pas de la casse
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- id = empreinte SHA-256 du jeton envoyé dans le cookie (le jeton lui-même n'est jamais stocké).
-- Supprimer un utilisateur supprime ses sessions.
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
