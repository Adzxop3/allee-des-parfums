-- Profils publics : l'affichage des parfums favoris (notés 5 étoiles dans la parfumothèque)
-- est un choix du membre, désactivé par défaut.
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_favorites BOOLEAN NOT NULL DEFAULT false;
