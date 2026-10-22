-- Questionnaire de recommandation.

-- Intensité votée par la communauté : tenue de 1 (très faible) à 5 (éternelle),
-- sillage de 1 (intime) à 4 (énorme). NULL quand il y a trop peu de votes.
ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS longevity REAL;
ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS sillage   REAL;

-- Réponses au questionnaire sauvegardées par l'utilisateur
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  answers    JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
