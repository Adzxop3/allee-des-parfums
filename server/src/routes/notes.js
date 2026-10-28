import { Router } from 'express'
import { browserCache, ONE_HOUR } from '../cache.js'
import { pool } from '../db.js'
import { ACCORD_FAMILIES } from '../families.js'
import { getPagination, parseId } from '../pagination.js'
import { COMBINED_RATING, COMMUNITY_JOIN, MIN_VOTES_FOR_BEST, RATING_COLUMNS } from '../ratings.js'

const router = Router()

// GET /api/notes?family=&limit=
// Notes triées par nombre de parfums ; family=none pour les notes sans famille
router.get('/', browserCache(ONE_HOUR), async (req, res) => {
  const family = String(req.query.family ?? '')
  if (family && family !== 'none' && !Object.hasOwn(ACCORD_FAMILIES, family)) {
    return res.status(400).json({ error: 'Famille inconnue' })
  }
  let where = ''
  const params = []
  if (family === 'none') where = 'WHERE family IS NULL'
  else if (family) {
    where = 'WHERE family = $1'
    params.push(family)
  }
  // Sans limit : toutes les notes (quelques milliers au plus)
  const limit = Math.min(5000, Number.parseInt(req.query.limit, 10))
  const limitClause = limit > 0 ? `LIMIT ${limit}` : ''

  const { rows } = await pool.query(
    `SELECT id, name, family, perfume_count FROM notes ${where}
     ORDER BY perfume_count DESC, name ${limitClause}`,
    params,
  )
  res.json(rows)
})

// GET /api/notes/:id
// La note et les notes qui lui sont le plus souvent associées
router.get('/:id', browserCache(ONE_HOUR), async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })

  const { rows } = await pool.query(
    'SELECT id, name, family, perfume_count FROM notes WHERE id = $1',
    [id],
  )
  if (!rows.length) return res.status(404).json({ error: 'Note introuvable' })
  const note = rows[0]

  // Associations précalculées par l'import (voir import.js)
  const { rows: associated } = await pool.query(
    `SELECT n.id, n.name, n.family, a.perfumes_together
     FROM note_associations a JOIN notes n ON n.id = a.associated_id
     WHERE a.note_id = $1
     ORDER BY a.rank`,
    [id],
  )

  res.json({ ...note, associated })
})

// GET /api/notes/:id/perfumes?page=&limit=
// Parfums contenant la note, les plus populaires d'abord
router.get('/:id/perfumes', async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })
  const { page, limit, offset } = getPagination(req.query)

  const { rows: noteRows } = await pool.query(
    'SELECT id, name, family, perfume_count FROM notes WHERE id = $1',
    [id],
  )
  if (!noteRows.length) return res.status(404).json({ error: 'Note introuvable' })
  const note = noteRows[0]

  // sort=rating : les mieux notés (note combinée), parmi les parfums d'au moins MIN_VOTES_FOR_BEST votes
  const byRating = req.query.sort === 'rating'

  // EXISTS (et non une jointure) : PostgreSQL parcourt les parfums dans l'ordre de popularité et
  // s'arrête dès que la page est remplie, au lieu de trier tous les parfums de la note (52 000 pour Musk)
  const where = `WHERE EXISTS (SELECT 1 FROM perfume_notes pn WHERE pn.note_id = $1 AND pn.perfume_id = p.id)
    ${byRating ? `AND p.rating_count >= ${MIN_VOTES_FOR_BEST}` : ''}`
  let total = note.perfume_count
  if (byRating) {
    const { rows: countRows } = await pool.query(`SELECT count(*)::int AS total FROM perfumes p ${where}`, [id])
    total = countRows[0].total
  }
  // positions : étages où la note apparaît dans le parfum (elle peut être à plusieurs)
  const { rows } = await pool.query(
    `SELECT p.id, p.name, b.name AS brand, p.year, p.gender, p.image_url, ${RATING_COLUMNS},
            (SELECT array_agg(pn.position) FROM perfume_notes pn WHERE pn.note_id = $1 AND pn.perfume_id = p.id) AS positions
     FROM perfumes p
     LEFT JOIN brands b ON b.id = p.brand_id
     ${COMMUNITY_JOIN}
     ${where}
     ORDER BY ${byRating ? `${COMBINED_RATING} DESC NULLS LAST,` : ''} p.rating_count DESC, p.id
     LIMIT ${limit} OFFSET ${offset}`,
    [id],
  )

  res.json({ note, page, limit, total, sort: byRating ? 'rating' : 'popular', results: rows })
})

export default router
