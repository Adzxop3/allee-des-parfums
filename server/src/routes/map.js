import { Router } from 'express'
import { browserCache, cached, ONE_HOUR } from '../cache.js'
import { pool } from '../db.js'

const router = Router()

// GET /api/map?limit=5000
// Points de la carte, les parfums les plus populaires d'abord.
// Format compact (la réponse peut compter des dizaines de milliers de points) :
// points = [[id, x, y, famille], ...] avec x et y entre 0 et 1.
router.get('/', browserCache(ONE_HOUR), async (req, res) => {
  // « Tout afficher » demande 1 000 000 de points : c'est aussi le plafond
  const limit = Math.min(1000000, Math.max(1, Number.parseInt(req.query.limit, 10) || 5000))

  // Tous les points, lus une fois puis gardés en mémoire ; chaque demande en prend les premiers
  const points = await cached('map', async () => {
    const { rows } = await pool.query(
      `SELECT m.perfume_id, m.x, m.y, m.family
       FROM perfume_map m JOIN perfumes p ON p.id = m.perfume_id
       ORDER BY p.rating_count DESC, p.id`,
    )
    return rows.map((r) => [r.perfume_id, r.x, r.y, r.family])
  })

  res.json({ total: points.length, points: points.slice(0, limit) })
})

export default router
