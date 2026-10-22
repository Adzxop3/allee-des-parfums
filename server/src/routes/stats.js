import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

// Ces statistiques ne changent qu'après un import : on les calcule une fois par démarrage
// du serveur (certaines prennent quelques secondes), puis on les garde en mémoire.
const cache = new Map()
function cached(key, compute) {
  if (!cache.has(key)) {
    cache.set(key, compute().catch((err) => {
      cache.delete(key) // une erreur ne reste pas en cache
      throw err
    }))
  }
  return cache.get(key)
}

const FIRST_DECADE = 1960 // avant, trop peu de parfums par décennie
const MIN_RATINGS = 100

// GET /api/stats/families-by-decade
// Nombre de parfums par décennie et famille de leur accord principal
router.get('/families-by-decade', async (req, res) => {
  const rows = await cached('families-by-decade', async () => {
    const { rows } = await pool.query(
      `WITH main_accord AS (
         SELECT DISTINCT ON (pa.perfume_id) pa.perfume_id, a.family
         FROM perfume_accords pa JOIN accords a ON a.id = pa.accord_id
         ORDER BY pa.perfume_id, pa.intensity DESC, a.id
       )
       SELECT (p.year / 10) * 10 AS decade, m.family, count(*)::int AS count
       FROM perfumes p JOIN main_accord m ON m.perfume_id = p.id
       WHERE p.year >= $1
       GROUP BY 1, 2 ORDER BY 1, 2`,
      [FIRST_DECADE],
    )
    return rows
  })
  res.json(rows)
})

// GET /api/stats/gender-by-decade
router.get('/gender-by-decade', async (req, res) => {
  const rows = await cached('gender-by-decade', async () => {
    const { rows } = await pool.query(
      `SELECT (year / 10) * 10 AS decade, gender, count(*)::int AS count
       FROM perfumes WHERE year >= $1 AND gender IS NOT NULL
       GROUP BY 1, 2 ORDER BY 1, 2`,
      [FIRST_DECADE],
    )
    return rows
  })
  res.json(rows)
})

// GET /api/stats/season-accords
// Pour chaque accord : écart moyen entre la part des votes « été » et « hiver » des parfums
// qui le contiennent (pondéré par l'intensité de l'accord), de -1 (hiver) à +1 (été)
router.get('/season-accords', async (req, res) => {
  const rows = await cached('season-accords', async () => {
    const { rows } = await pool.query(
      `WITH seasons AS (
         SELECT pm.perfume_id,
                max(pm.score) FILTER (WHERE m.name = 'summer') AS summer,
                max(pm.score) FILTER (WHERE m.name = 'winter') AS winter
         FROM perfume_moods pm JOIN moods m ON m.id = pm.mood_id
         WHERE m.type = 'season'
         GROUP BY pm.perfume_id
       )
       SELECT a.name AS accord,
              sum(pa.intensity * (s.summer - s.winter)) / sum(pa.intensity) AS lean,
              count(*)::int AS perfumes
       FROM perfume_accords pa
       JOIN accords a ON a.id = pa.accord_id
       JOIN seasons s ON s.perfume_id = pa.perfume_id
       JOIN perfumes p ON p.id = pa.perfume_id AND p.rating_count >= $1
       GROUP BY a.name
       HAVING count(*) >= 300
       ORDER BY lean`,
      [MIN_RATINGS],
    )
    return rows
  })
  res.json(rows)
})

// GET /api/stats/brand-accords
// Pour les 12 marques les plus populaires : part de leurs parfums où chaque accord
// figure parmi les 3 principaux
router.get('/brand-accords', async (req, res) => {
  const rows = await cached('brand-accords', async () => {
    const { rows } = await pool.query(
      `WITH brand AS (
         SELECT b.id, b.name, sum(p.rating_count) AS popularity
         FROM perfumes p JOIN brands b ON b.id = p.brand_id
         WHERE p.rating_count >= $1
         GROUP BY b.id ORDER BY popularity DESC LIMIT 12
       ),
       perfume AS (
         SELECT p.id, p.brand_id FROM perfumes p JOIN brand ON brand.id = p.brand_id
         WHERE p.rating_count >= $1
       ),
       ranked AS (
         SELECT pa.perfume_id, pa.accord_id,
                row_number() OVER (PARTITION BY pa.perfume_id ORDER BY pa.intensity DESC, pa.accord_id) AS rank
         FROM perfume_accords pa JOIN perfume ON perfume.id = pa.perfume_id
       ),
       brand_size AS (SELECT brand_id, count(*) AS total FROM perfume GROUP BY brand_id)
       SELECT brand.name AS brand, a.name AS accord, count(*)::real / max(bs.total) AS share,
              max(brand.popularity) AS popularity
       FROM ranked r
       JOIN perfume ON perfume.id = r.perfume_id
       JOIN brand ON brand.id = perfume.brand_id
       JOIN brand_size bs ON bs.brand_id = brand.id
       JOIN accords a ON a.id = r.accord_id
       WHERE r.rank <= 3
       GROUP BY brand.name, a.name
       ORDER BY popularity DESC, share DESC`,
      [MIN_RATINGS],
    )
    return rows.map(({ popularity, ...row }) => row)
  })
  res.json(rows)
})

export default router
