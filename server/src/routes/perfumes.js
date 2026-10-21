import { Router } from 'express'
import { pool } from '../db.js'
import { getPagination, parseId } from '../pagination.js'

const router = Router()

// GET /api/perfumes?q=&page=&limit=
// Recherche dans le nom du parfum et le nom de la marque
router.get('/', async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)
  const q = (req.query.q ?? '').trim()

  // % et _ sont des jokers pour ILIKE : on les échappe
  const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`
  // La sous-requête sur brands permet à PostgreSQL d'utiliser les index de recherche
  const where = q
    ? 'WHERE p.name ILIKE $1 OR p.brand_id IN (SELECT id FROM brands WHERE name ILIKE $1)'
    : ''
  const params = q ? [pattern] : []

  const { rows: countRows } = await pool.query(
    `SELECT count(*)::int AS total FROM perfumes p LEFT JOIN brands b ON b.id = p.brand_id ${where}`,
    params,
  )
  const { rows } = await pool.query(
    `SELECT p.id, p.name, b.name AS brand, p.year, p.gender, p.image_url
     FROM perfumes p LEFT JOIN brands b ON b.id = p.brand_id
     ${where}
     ORDER BY p.name, p.id
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  )

  res.json({ page, limit, total: countRows[0].total, results: rows })
})

// GET /api/perfumes/:id
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })

  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.year, p.gender, p.concentration, p.description, p.image_url,
            b.id AS brand_id, b.name AS brand, b.country AS brand_country
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
       WHERE pn.perfume_id = $1 ORDER BY n.name`,
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
    perfumers: perfumers.rows,
    notes: notesByPosition,
    accords: accords.rows,
    moods: moods.rows,
  })
})

export default router
