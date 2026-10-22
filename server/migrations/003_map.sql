-- Carte olfactive : coordonnées 2D et voisins les plus proches (remplis par precompute/build_map.py)

CREATE TABLE IF NOT EXISTS perfume_map (
  perfume_id INTEGER PRIMARY KEY REFERENCES perfumes(id) ON DELETE CASCADE,
  x          REAL NOT NULL,
  y          REAL NOT NULL
);

-- Famille de l'accord principal du parfum (couleur du point sur la carte)
ALTER TABLE perfume_map ADD COLUMN IF NOT EXISTS family TEXT;

-- Pour chaque parfum, les parfums de la carte qui lui ressemblent le plus (similarité cosinus, 0 à 1)
CREATE TABLE IF NOT EXISTS perfume_neighbors (
  perfume_id  INTEGER NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  neighbor_id INTEGER NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  similarity  REAL NOT NULL,
  PRIMARY KEY (perfume_id, neighbor_id)
);
