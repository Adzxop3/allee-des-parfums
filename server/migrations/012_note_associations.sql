-- Notes le plus souvent associées à chaque note (12 par note), affichées sur la fiche d'une note.
-- Précalculées par l'import (npm run import) : calculées à la volée, elles prenaient jusqu'à
-- une seconde pour les notes les plus courantes.
CREATE TABLE IF NOT EXISTS note_associations (
  note_id           INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  rank              SMALLINT NOT NULL,
  associated_id     INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  perfumes_together INTEGER NOT NULL,
  PRIMARY KEY (note_id, rank)
);
