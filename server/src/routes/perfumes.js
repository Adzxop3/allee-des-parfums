import { Router } from 'express'
import { pool } from '../db.js'
import { getPagination, parseId } from '../pagination.js'
import { COMBINED_RATING, COMMUNITY_JOIN, MIN_VOTES_FOR_BEST, RATING_COLUMNS } from '../ratings.js'
import { reviewSummary } from './reviews.js'

const router = Router()

// GET /api/perfumes?q=&page=&limit=
// Recherche dans le nom du parfum et le nom de la marque
router.get('/', async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)
  const q = (req.query.q ?? '').trim()

  // % et _ sont des jokers pour ILIKE : on les échappe
  const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`
  // sort=rating : les mieux notés (note combinée), parmi les parfums d'au moins MIN_VOTES_FOR_BEST votes
  const byRating = req.query.sort === 'rating'

  // La sous-requête sur brands permet à PostgreSQL d'utiliser les index de recherche
  const conditions = []
  const params = []
  if (q) {
    params.push(pattern)
    conditions.push('(p.name ILIKE $1 OR p.brand_id IN (SELECT id FROM brands WHERE name ILIKE $1))')
  }
  if (byRating) conditions.push(`p.rating_count >= ${MIN_VOTES_FOR_BEST}`)
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows: countRows } = await pool.query(`SELECT count(*)::int AS total FROM perfumes p ${where}`, params)
  const { rows } = await pool.query(
    `SELECT p.id, p.name, b.name AS brand, p.year, p.gender, p.image_url, ${RATING_COLUMNS}
     FROM perfumes p LEFT JOIN brands b ON b.id = p.brand_id
     ${COMMUNITY_JOIN}
     ${where}
     ORDER BY ${byRating ? `${COMBINED_RATING} DESC NULLS LAST, p.rating_count DESC,` : 'p.name,'} p.id
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  )

  res.json({ page, limit, total: countRows[0].total, sort: byRating ? 'rating' : 'name', results: rows })
})

// GET /api/perfumes/random?near=12,34
// Sans near : un parfum au hasard parmi les parfums assez votés (fiches complètes).
// Avec near (derniers parfums consultés) : un voisin de l'un d'eux, jamais déjà consulté.
// Déclarée avant /:id, sinon "random" serait pris pour un identifiant.
router.get('/random', async (req, res) => {
  const near = String(req.query.near ?? '')
    .split(',')
    .map(parseId)
    .filter(Boolean)
    .slice(0, 10)

  if (near.length) {
    const { rows } = await pool.query(
      `SELECT nb.neighbor_id AS id, p.id AS near_id, p.name AS near_name
       FROM perfume_neighbors nb JOIN perfumes p ON p.id = nb.perfume_id
       WHERE nb.perfume_id = ANY($1) AND NOT nb.neighbor_id = ANY($1)
       ORDER BY random()
       LIMIT 1`,
      [near],
    )
    if (rows.length) {
      return res.json({ id: rows[0].id, similarTo: { id: rows[0].near_id, name: rows[0].near_name } })
    }
  }

  const { rows } = await pool.query(
    'SELECT id FROM perfumes WHERE rating_count >= 100 ORDER BY random() LIMIT 1',
  )
  res.json({ id: rows[0].id, similarTo: null })
})

// GET /api/perfumes/:id/neighbors?limit=
// Parfums les plus ressemblants (accords + notes), précalculés par precompute/build_map.py
router.get('/:id/neighbors', async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })
  const limit = Math.min(12, Math.max(1, Number.parseInt(req.query.limit, 10) || 12))

  const { rows: exists } = await pool.query('SELECT 1 FROM perfumes WHERE id = $1', [id])
  if (!exists.length) return res.status(404).json({ error: 'Parfum introuvable' })

  const { rows } = await pool.query(
    `SELECT p.id, p.name, b.name AS brand, p.year, p.gender, p.image_url, nb.similarity
     FROM perfume_neighbors nb
     JOIN perfumes p ON p.id = nb.neighbor_id
     LEFT JOIN brands b ON b.id = p.brand_id
     WHERE nb.perfume_id = $1
     ORDER BY nb.similarity DESC
     LIMIT $2`,
    [id, limit],
  )
  res.json(rows)
})

// GET /api/perfumes/:id
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })

  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.year, p.gender, p.concentration, p.description, p.image_url,
            b.id AS brand_id, b.name AS brand, b.country AS brand_country,
            p.rating_avg, p.rating_count
     FROM perfumes p LEFT JOIN brands b ON b.id = p.brand_id
     WHERE p.id = $1`,
    [id],
  )
  if (!rows.length) return res.status(404).json({ error: 'Parfum introuvable' })
  const perfume = rows[0]

  const [perfumers, notes, accords, moods] = await Promise.all([
    pool.query(
      `SELECT pr.id, pr.name FROM perfume_perfumers pp
       JOIN perfumers pr ON pr.id = pp.perfumer_id
       WHERE pp.perfume_id = $1 ORDER BY pr.name`,
      [id],
    ),
    pool.query(
      `SELECT n.id, n.name, n.family, pn.position FROM perfume_notes pn
       JOIN notes n ON n.id = pn.note_id
       WHERE pn.perfume_id = $1 ORDER BY pn.weight DESC NULLS LAST, n.name`,
      [id],
    ),
    pool.query(
      `SELECT a.id, a.name, pa.intensity FROM perfume_accords pa
       JOIN accords a ON a.id = pa.accord_id
       WHERE pa.perfume_id = $1 ORDER BY pa.intensity DESC`,
      [id],
    ),
    pool.query(
      `SELECT m.id, m.type, m.name, pm.score FROM perfume_moods pm
       JOIN moods m ON m.id = pm.mood_id
       WHERE pm.perfume_id = $1 ORDER BY m.type, pm.score DESC`,
      [id],
    ),
  ])

  // Notes regroupées par étage de la pyramide
  const notesByPosition = { top: [], heart: [], base: [], flat: [] }
  for (const { position, ...note } of notes.rows) notesByPosition[position].push(note)

  res.json({
    ...perfume,
    // Deux notes distinctes : celle des votes Fragrantica (dataset) et celle des avis des membres du site
    community: await reviewSummary(id),
    perfumers: perfumers.rows,
    notes: notesByPosition,
    accords: accords.rows,
    moods: moods.rows,
  })
})

export default router
