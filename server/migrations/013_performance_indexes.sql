-- Index ajoutés après mesure des requêtes (phase 5, performance).

-- « Les mieux notés » (recherche, notes) : la note des parfums d'au moins 100 votes est lue
-- dans ce petit index (26 000 lignes) au lieu de parcourir toute la table (124 ms -> 13 ms).
-- Le seuil doit rester égal à MIN_VOTES_FOR_BEST (src/ratings.js).
CREATE INDEX IF NOT EXISTS perfumes_best_rated_idx
  ON perfumes (id, rating_avg, rating_count) WHERE rating_count >= 100;

-- Clés étrangères vers users : à la suppression d'un compte, ses commentaires et ses
-- signalements sont retrouvés par index plutôt qu'en parcourant les tables.
CREATE INDEX IF NOT EXISTS comments_user_idx ON comments (user_id);
CREATE INDEX IF NOT EXISTS reports_reporter_idx ON reports (reporter_id);
