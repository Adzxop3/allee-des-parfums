import { Router } from 'express'
import { pool } from '../db.js'
import { getPagination } from '../pagination.js'

const router = Router()

// En dessous de ce nombre de votants, les scores (parts de votes, accords) sont peu fiables
const MIN_RATINGS = 100

// Paramètre de l'URL -> type d'ambiance en base
const FILTERS = { season: 'season', occasion: 'occasion', mood: 'mood' }

// GET /api/moods : les ambiances disponibles, par type
router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT id, type, name FROM moods ORDER BY type, id')
  res.json(rows)
})

// GET /api/moods/perfumes?season=&occasion=&mood=&page=&limit=
// Score combiné = moyenne des scores des ambiances choisies ; sans filtre, tri par popularité
router.get('/perfumes', async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)

  const { rows: moods } = await pool.query('SELECT id, type, name FROM moods')
  const selected = []
  for (const [param, type] of Object.entries(FILTERS)) {
    const name = req.query[param]
    if (!name) continue
    const mood = moods.find((m) => m.type === type && m.name === name)
    if (!mood) return res.status(400).json({ error: `Valeur inconnue pour ${param} : ${name}` })
    selected.push(mood.id)
  }

  // Une jointure par ambiance choisie : seuls les parfums qui ont un score pour chacune restent
  const joins = selected
    .map((_, i) => `JOIN perfume_moods pm${i} ON pm${i}.perfume_id = p.id AND pm${i}.mood_id = $${i + 2}`)
    .join('\n')
  const score = selected.length
    ? `(${selected.map((_, i) => `pm${i}.score`).join(' + ')}) / ${selected.length}`
    : 'NULL::real'
  // 1. Parfums assez votés : lus dans l'index (rating_count, id), sans parcourir la table
  // 2. Score, tri et pagination sur ces seuls identifiants ; count(*) OVER () donne le total
  // 3. Les infos d'affichage ne sont lues que pour la page demandée
  const { rows } = await pool.query(
    `WITH popular AS MATERIALIZED (
       SELECT id, rating_count FROM perfumes WHERE rating_count >= $1
     ),
     ranked AS (
       SELECT p.id, p.rating_count, ${score} AS score, count(*) OVER ()::int AS total
       FROM popular p
       ${joins}
       ORDER BY score DESC NULLS LAST, p.rating_count DESC, p.id
       LIMIT ${limit} OFFSET ${offset}
     )
     SELECT r.id, pf.name, b.name AS brand, pf.year, pf.gender, pf.image_url, r.score, r.total
     FROM ranked r
     JOIN perfumes pf ON pf.id = r.id
     LEFT JOIN brands b ON b.id = pf.brand_id
     ORDER BY r.score DESC NULLS LAST, r.rating_count DESC, r.id`,
    [MIN_RATINGS, ...selected],
  )

  // Au-delà de la dernière page, aucune ligne : le total n'est alors pas connu (0)
  const total = rows[0]?.total ?? 0
  res.json({ page, limit, total, results: rows.map(({ total, ...perfume }) => perfume) })
})

export default router
