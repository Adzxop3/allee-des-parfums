import { Router } from 'express'
import { pool } from '../db.js'
import { getPagination, parseId } from '../pagination.js'

const router = Router()

// GET /api/notes
// Toutes les notes, avec le nombre de parfums qui les contiennent
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT n.id, n.name, n.family, count(DISTINCT pn.perfume_id)::int AS perfume_count
     FROM notes n LEFT JOIN perfume_notes pn ON pn.note_id = n.id
     GROUP BY n.id
     ORDER BY n.name`,
  )
  res.json(rows)
})

// GET /api/notes/:id/perfumes?page=&limit=
router.get('/:id/perfumes', async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })
  const { page, limit, offset } = getPagination(req.query)

  const { rows: noteRows } = await pool.query('SELECT id, name, family FROM notes WHERE id = $1', [id])
  if (!noteRows.length) return res.status(404).json({ error: 'Note introuvable' })

  // Une note peut apparaître à plusieurs étages d'un même parfum : on regroupe
  const { rows: countRows } = await pool.query(
    'SELECT count(DISTINCT perfume_id)::int AS total FROM perfume_notes WHERE note_id = $1',
    [id],
  )
  const { rows } = await pool.query(
    `SELECT p.id, p.name, b.name AS brand, p.year, p.gender, p.image_url,
            array_agg(pn.position) AS positions
     FROM perfume_notes pn
     JOIN perfumes p ON p.id = pn.perfume_id
     LEFT JOIN brands b ON b.id = p.brand_id
     WHERE pn.note_id = $1
     GROUP BY p.id, b.name
     ORDER BY p.name, p.id
     LIMIT ${limit} OFFSET ${offset}`,
    [id],
  )

  res.json({ note: noteRows[0], page, limit, total: countRows[0].total, results: rows })
})

export default router
