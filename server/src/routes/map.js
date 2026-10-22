import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

// GET /api/map?limit=5000
// Points de la carte, les parfums les plus populaires d'abord.
// Format compact (la réponse peut compter des dizaines de milliers de points) :
// points = [[id, x, y, famille], ...] avec x et y entre 0 et 1.
router.get('/', async (req, res) => {
  const limit = Math.max(1, Number.parseInt(req.query.limit, 10) || 5000)

  const { rows } = await pool.query(
    `SELECT m.perfume_id, m.x, m.y, m.family
     FROM perfume_map m JOIN perfumes p ON p.id = m.perfume_id
     ORDER BY p.rating_count DESC, p.id
     LIMIT $1`,
    [limit],
  )
  const { rows: countRows } = await pool.query('SELECT count(*)::int AS total FROM perfume_map')

  res.json({
    total: countRows[0].total,
    points: rows.map((r) => [r.perfume_id, r.x, r.y, r.family]),
  })
})

export default router
