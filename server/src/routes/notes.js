import { Router } from 'express'
import { pool } from '../db.js'
import { getPagination, parseId } from '../pagination.js'

const router = Router()

// GET /api/notes?family=&limit=
// Notes triées par nombre de parfums ; family=none pour les notes sans famille
router.get('/', async (req, res) => {
  const { family } = req.query
  let where = ''
  const params = []
  if (family === 'none') where = 'WHERE family IS NULL'
  else if (family) {
    where = 'WHERE family = $1'
    params.push(family)
  }
  const limit = Number.parseInt(req.query.limit, 10)
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
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })

  const { rows } = await pool.query(
    'SELECT id, name, family, perfume_count FROM notes WHERE id = $1',
    [id],
  )
  if (!rows.length) return res.status(404).json({ error: 'Note introuvable' })
  const note = rows[0]

  // Score cosinus : parfums en commun / racine(parfums de A × parfums de B).
  // Il évite que les notes omniprésentes (Musk, Amber...) arrivent toujours en tête.
  const { rows: associated } = await pool.query(
    `WITH together AS (
       SELECT b.note_id, count(DISTINCT b.perfume_id)::int AS count
       FROM perfume_notes a
       JOIN perfume_notes b ON b.perfume_id = a.perfume_id AND b.note_id <> a.note_id
       WHERE a.note_id = $1
       GROUP BY b.note_id
     )
     SELECT n.id, n.name, n.family, t.count AS perfumes_together
     FROM together t JOIN notes n ON n.id = t.note_id
     WHERE n.perfume_count >= 10
     ORDER BY t.count / sqrt(n.perfume_count::real * $2) DESC
     LIMIT 12`,
    [id, Math.max(1, note.perfume_count)],
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

  // Une note peut apparaître à plusieurs étages d'un même parfum : on regroupe
  const { rows } = await pool.query(
    `SELECT p.id, p.name, b.name AS brand, p.year, p.gender, p.image_url,
            array_agg(pn.position) AS positions
     FROM perfume_notes pn
     JOIN perfumes p ON p.id = pn.perfume_id
     LEFT JOIN brands b ON b.id = p.brand_id
     WHERE pn.note_id = $1
     GROUP BY p.id, b.name
     ORDER BY p.rating_count DESC, p.id
     LIMIT ${limit} OFFSET ${offset}`,
    [id],
  )

  res.json({ note, page, limit, total: note.perfume_count, results: rows })
})

export default router
