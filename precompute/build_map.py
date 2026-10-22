"""Précalcul de la carte olfactive.

1. Construit un vecteur par parfum : accords (intensité) + notes (poids × rareté).
2. Projette en 2D les parfums assez votés avec UMAP -> table perfume_map
   (avec la famille de leur accord principal, pour la couleur des points).
3. Calcule pour chaque parfum ses voisins les plus proches parmi ceux de la carte -> perfume_neighbors.

Usage (depuis la racine du projet) : npm run map
"""

import time
from pathlib import Path

import numpy as np
import psycopg
import umap
from scipy import sparse
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import normalize

MIN_RATINGS = 100  # parfums affichés sur la carte (même seuil que les ambiances)
MIN_NOTE_PERFUMES = 30  # notes trop rares ignorées : elles n'aident pas à comparer
ACCORDS_SHARE = 0.6  # part des accords dans la similarité (le reste : les notes)
NEIGHBORS = 12
CHUNK = 1000  # parfums traités à la fois pour le calcul des voisins


def read_env():
    """Lit les paramètres de connexion dans server/.env."""
    env = {}
    for line in (Path(__file__).parent.parent / "server" / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip()
    return env


def connect():
    env = read_env()
    return psycopg.connect(
        host=env["PGHOST"],
        port=env["PGPORT"],
        dbname=env["PGDATABASE"],
        user=env["PGUSER"],
        password=env["PGPASSWORD"],
    )


def build_vectors(conn):
    """Renvoie (ids des parfums, nombre de votants, matrice creuse des vecteurs normalisés)."""
    perfumes = conn.execute("SELECT id, rating_count FROM perfumes ORDER BY id").fetchall()
    ids = np.array([p[0] for p in perfumes])
    ratings = np.array([p[1] for p in perfumes])
    row_of = {pid: i for i, pid in enumerate(ids)}

    # Accords : intensité de 0 à 1
    accords = conn.execute("SELECT perfume_id, accord_id, intensity FROM perfume_accords").fetchall()
    accord_col = {aid: j for j, aid in enumerate(sorted({a[1] for a in accords}))}
    accord_matrix = sparse.csr_matrix(
        (
            [a[2] / 100 for a in accords],
            ([row_of[a[0]] for a in accords], [accord_col[a[1]] for a in accords]),
        ),
        shape=(len(ids), len(accord_col)),
    )

    # Notes : poids (0 à 100, une note de poids 0 compte quand même un peu) × rareté (IDF)
    notes = conn.execute(
        """SELECT pn.perfume_id, pn.note_id, max(pn.weight), max(n.perfume_count)
           FROM perfume_notes pn JOIN notes n ON n.id = pn.note_id
           WHERE n.perfume_count >= %s
           GROUP BY pn.perfume_id, pn.note_id""",
        (MIN_NOTE_PERFUMES,),
    ).fetchall()
    note_col = {nid: j for j, nid in enumerate(sorted({n[1] for n in notes}))}
    note_matrix = sparse.csr_matrix(
        (
            [(0.2 + 0.8 * (n[2] or 0) / 100) * np.log(len(ids) / n[3]) for n in notes],
            ([row_of[n[0]] for n in notes], [note_col[n[1]] for n in notes]),
        ),
        shape=(len(ids), len(note_col)),
    )

    # Chaque bloc est normalisé puis pondéré : cosinus = 0,6 × cos(accords) + 0,4 × cos(notes)
    vectors = sparse.hstack(
        [
            np.sqrt(ACCORDS_SHARE) * normalize(accord_matrix),
            np.sqrt(1 - ACCORDS_SHARE) * normalize(note_matrix),
        ]
    ).tocsr()
    # Un parfum sans notes (ou sans accords) est renormalisé sur le bloc qui reste
    vectors = normalize(vectors).astype(np.float32)

    print(f"{len(ids)} parfums, {len(accord_col)} accords, {len(note_col)} notes retenues")
    return ids, ratings, vectors


def project(vectors):
    """Coordonnées 2D entre 0 et 1 (même échelle sur les deux axes)."""
    reduced = TruncatedSVD(n_components=50, random_state=42).fit_transform(vectors)
    coords = umap.UMAP(
        n_neighbors=15, min_dist=0.1, metric="cosine", random_state=42
    ).fit_transform(reduced)
    coords -= coords.min(axis=0)
    return coords / coords.max()


def nearest_neighbors(vectors, map_rows, ids):
    """Pour chaque parfum : les NEIGHBORS parfums de la carte les plus similaires (hors lui-même)."""
    candidates = vectors[map_rows].toarray()
    candidate_ids = ids[map_rows]
    has_vector = np.asarray(vectors.getnnz(axis=1) > 0)
    rows = []
    for start in range(0, vectors.shape[0], CHUNK):
        chunk = np.arange(start, min(start + CHUNK, vectors.shape[0]))
        chunk = chunk[has_vector[chunk]]
        similarities = vectors[chunk].toarray() @ candidates.T
        similarities[ids[chunk][:, None] == candidate_ids[None, :]] = -1  # pas lui-même
        best = np.argpartition(-similarities, NEIGHBORS, axis=1)[:, :NEIGHBORS]
        for i, row in enumerate(chunk):
            for j in best[i]:
                rows.append((int(ids[row]), int(candidate_ids[j]), float(similarities[i, j])))
    return rows


def main():
    started = time.time()
    with connect() as conn:
        ids, ratings, vectors = build_vectors(conn)

        has_vector = np.asarray(vectors.getnnz(axis=1) > 0)
        map_rows = np.flatnonzero((ratings >= MIN_RATINGS) & has_vector)
        print(f"Carte : {len(map_rows)} parfums (au moins {MIN_RATINGS} votants)")

        coords = project(vectors[map_rows])
        print(f"Projection UMAP terminée ({time.time() - started:.0f} s)")

        neighbors = nearest_neighbors(vectors, map_rows, ids)
        print(f"Voisins calculés : {len(neighbors)} lignes ({time.time() - started:.0f} s)")

        # Remplacement complet des deux tables, dans une seule transaction
        with conn.transaction(), conn.cursor() as cur:
            cur.execute("TRUNCATE perfume_map, perfume_neighbors")
            with cur.copy("COPY perfume_map (perfume_id, x, y) FROM STDIN") as copy:
                for row, (x, y) in zip(map_rows, coords):
                    copy.write_row((int(ids[row]), float(x), float(y)))
            with cur.copy("COPY perfume_neighbors (perfume_id, neighbor_id, similarity) FROM STDIN") as copy:
                for neighbor in neighbors:
                    copy.write_row(neighbor)
            # Famille dominante = famille de l'accord le plus intense
            cur.execute(
                """UPDATE perfume_map m SET family = (
                     SELECT a.family FROM perfume_accords pa JOIN accords a ON a.id = pa.accord_id
                     WHERE pa.perfume_id = m.perfume_id ORDER BY pa.intensity DESC, a.id LIMIT 1)"""
            )
        conn.execute("ANALYZE perfume_map")
        conn.execute("ANALYZE perfume_neighbors")

    print(f"Terminé en {time.time() - started:.0f} s")


if __name__ == "__main__":
    main()
