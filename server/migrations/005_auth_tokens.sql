-- Vérification de l'email et réinitialisation du mot de passe.

-- Date de confirmation de l'adresse email (NULL tant qu'elle n'est pas confirmée)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Jetons à usage unique envoyés par email.
-- id = empreinte SHA-256 du jeton (le jeton lui-même n'est jamais stocké).
CREATE TABLE IF NOT EXISTS auth_tokens (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose    TEXT NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_tokens_user_id_idx ON auth_tokens (user_id);
