import { Router } from 'express'
import { z } from 'zod'
import { requireVerifiedEmail } from '../auth.js'
import { pool } from '../db.js'
import { parseId } from '../pagination.js'
import { COMBINED_RATING, COMMUNITY_JOIN, RATING_COLUMNS } from '../ratings.js'
import { parseBody } from '../validate.js'

// Parfumothèque de l'utilisateur connecté (email confirmé obligatoire).
// Toutes les requêtes sont filtrées par req.user.id : chacun ne voit et ne modifie que sa collection.
const router = Router()
router.use(requireVerifiedEmail)

const STATUSES = ['owned', 'wishlist', 'tested']
const status = z.enum(STATUSES, { error: 'Statut invalide' })
const rating = z
  .number({ error: 'Note invalide' })
  .int({ error: 'Note invalide' })
  .min(1, { error: 'Note de 1 à 5' })
  .max(5, { error: 'Note de 1 à 5' })
  .nullable()
// Un commentaire vide est enregistré comme « pas de commentaire »
const personalNote = z
  .string({ error: 'Commentaire invalide' })
  .trim()
  .max(1000, { error: '1000 caractères au maximum' })
  .nullable()
  .transform((text) => text || null)

const addSchema = z.object({
  perfumeId: z.number({ error: 'Parfum invalide' }).int().positive(),
  status,
  rating: rating.optional(),
  personalNote: personalNote.optional(),
})
const updateSchema = z
  .object({ status: status.optional(), rating: rating.optional(), personalNote: personalNote.optional() })
  .refine((data) => Object.keys(data).length > 0, { error: 'Rien à modifier' })

// Colonnes renvoyées pour un élément : le parfum (id = id du parfum) et ce que l'utilisateur en dit
const ITEM_COLUMNS = `p.id, p.name, b.name AS brand, p.year, p.gender, p.image_url,
  ci.status, ci.rating, ci.note_perso AS "personalNote", ci.added_at AS "addedAt"`
const ITEM_FROM = `collection_items ci
  JOIN perfumes p ON p.id = ci.perfume_id
  LEFT JOIN brands b ON b.id = p.brand_id`

// Statut passé dans l'URL (?status=owned), facultatif ; undefined si invalide
function statusParam(req, res) {
  const value = req.query.status
  if (value === undefined || value === '') return null
  if (!STATUSES.includes(value)) {
    res.status(400).json({ error: 'Statut invalide' })
    return undefined
  }
  return value
}

async function findItem(userId, perfumeId) {
  const { rows } = await pool.query(
    `SELECT ${ITEM_COLUMNS} FROM ${ITEM_FROM} WHERE ci.user_id = $1 AND ci.perfume_id = $2`,
    [userId, perfumeId],
  )
  return rows[0] ?? null
}

// GET /api/collection?status=owned
// Les parfums de la collection (les plus récemment ajoutés d'abord) et le nombre par statut
router.get('/', async (req, res) => {
  const filter = statusParam(req, res)
  if (filter === undefined) return

  const { rows: items } = await pool.query(
    `SELECT ${ITEM_COLUMNS} FROM ${ITEM_FROM}
     WHERE ci.user_id = $1 AND ($2::text IS NULL OR ci.status = $2)
     ORDER BY ci.added_at DESC`,
    [req.user.id, filter],
  )
  const { rows: countRows } = await pool.query(
    'SELECT status, count(*)::int AS count FROM collection_items WHERE user_id = $1 GROUP BY status',
    [req.user.id],
  )
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]))
  for (const row of countRows) counts[row.status] = row.count

  res.json({ counts, items })
})

// GET /api/collection/summary?status=owned
// Notes et accords les plus présents dans la collection (ou dans un statut)
router.get('/summary', async (req, res) => {
  const filter = statusParam(req, res)
  if (filter === undefined) return
  const params = [req.user.id, filter]
  const mine = 'ci.user_id = $1 AND ($2::text IS NULL OR ci.status = $2)'

  const [perfumes, notes, accords] = await Promise.all([
    pool.query(`SELECT count(*)::int AS count FROM collection_items ci WHERE ${mine}`, params),
    pool.query(
      `SELECT n.id, n.name, count(DISTINCT ci.perfume_id)::int AS count
       FROM collection_items ci
       JOIN perfume_notes pn ON pn.perfume_id = ci.perfume_id
       JOIN notes n ON n.id = pn.note_id
       WHERE ${mine}
       GROUP BY n.id ORDER BY count DESC, n.name LIMIT 10`,
      params,
    ),
    // Accords classés par intensité cumulée : un accord dominant pèse plus qu'un accord discret
    pool.query(
      `SELECT a.name, count(*)::int AS count
       FROM collection_items ci
       JOIN perfume_accords pa ON pa.perfume_id = ci.perfume_id
       JOIN accords a ON a.id = pa.accord_id
       WHERE ${mine}
       GROUP BY a.name ORDER BY sum(pa.intensity) DESC LIMIT 10`,
      params,
    ),
  ])

  res.json({ perfumes: perfumes.rows[0].count, notes: notes.rows, accords: accords.rows })
})

// GET /api/collection/recommendations
// Parfums proches de ceux que j'ai notés 4 ou 5 étoiles (voisins précalculés à partir des accords et notes,
// voir precompute/build_map.py). Score = somme de (poids de mon parfum × similarité) : un parfum proche
// de plusieurs de mes favoris passe devant. Les parfums déjà dans ma collection sont exclus.
router.get('/recommendations', async (req, res) => {
  const { rows: liked } = await pool.query(
    `SELECT ci.perfume_id, p.name, CASE WHEN ci.rating = 5 THEN 1.0 ELSE 0.7 END AS weight
     FROM collection_items ci JOIN perfumes p ON p.id = ci.perfume_id
     WHERE ci.user_id = $1 AND ci.rating >= 4`,
    [req.user.id],
  )
  if (!liked.length) return res.json({ basedOn: 0, results: [] })

  const { rows } = await pool.query(
    `WITH liked AS (
       SELECT * FROM unnest($2::int[], $3::real[]) AS l(perfume_id, weight)
     ),
     candidates AS (
       SELECT nb.neighbor_id AS id,
              sum(l.weight * nb.similarity) AS score,
              array_agg(nb.perfume_id ORDER BY l.weight * nb.similarity DESC) AS sources
       FROM perfume_neighbors nb JOIN liked l ON l.perfume_id = nb.perfume_id
       WHERE nb.neighbor_id NOT IN (SELECT perfume_id FROM collection_items WHERE user_id = $1)
       GROUP BY nb.neighbor_id
       ORDER BY score DESC
       LIMIT 60
     )
     SELECT p.id, p.name, b.name AS brand, p.year, p.gender, p.image_url, c.sources, ${RATING_COLUMNS}
     FROM candidates c
     JOIN perfumes p ON p.id = c.id
     LEFT JOIN brands b ON b.id = p.brand_id
     ${COMMUNITY_JOIN}
     -- La note (Fragrantica + membres) module légèrement la ressemblance : ±10 % entre 1/5 et 5/5
     ORDER BY c.score * (0.9 + 0.2 * coalesce((${COMBINED_RATING} - 1) / 4, 0.5)) DESC`,
    [req.user.id, liked.map((l) => l.perfume_id), liked.map((l) => Number(l.weight))],
  )

  // Variété : chaque favori fournit au plus `perSource` suggestions, pour qu'un seul parfum
  // (et ses très proches voisins) n'occupe pas toute la liste
  const LIMIT = 12
  const perSource = Math.max(3, Math.ceil(LIMIT / liked.length))
  const used = new Map()
  const picked = []
  for (const row of rows) {
    const main = row.sources[0]
    if ((used.get(main) ?? 0) >= perSource) continue
    used.set(main, (used.get(main) ?? 0) + 1)
    picked.push(row)
    if (picked.length === LIMIT) break
  }

  const names = new Map(liked.map((l) => [l.perfume_id, l.name]))
  // « Proche de Coco Mademoiselle », mais « Proche d'Aqua Allegoria »
  const of = (name) => (/^[aeiouyàâéèêîôû]/i.test(name) ? `d'${name}` : `de ${name}`)
  const results = picked.map(({ sources, ...perfume }) => {
    const near = sources.slice(0, 2).map((id) => names.get(id))
    return { ...perfume, explanation: `Proche ${of(near[0])}${near[1] ? ` et ${of(near[1])}` : ''}.` }
  })
  res.json({ basedOn: liked.length, results })
})

// GET /api/collection/:perfumeId : ce parfum est-il dans ma collection ? ({ item: null } sinon)
router.get('/:perfumeId', async (req, res) => {
  const perfumeId = parseId(req.params.perfumeId)
  if (!perfumeId) return res.status(400).json({ error: 'Identifiant invalide' })
  res.json({ item: await findItem(req.user.id, perfumeId) })
})

// POST /api/collection  { perfumeId, status, rating?, personalNote? }
router.post('/', async (req, res) => {
  const data = parseBody(addSchema, req, res)
  if (!data) return

  try {
    await pool.query(
      `INSERT INTO collection_items (user_id, perfume_id, status, rating, note_perso)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, data.perfumeId, data.status, data.rating ?? null, data.personalNote ?? null],
    )
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ce parfum est déjà dans votre collection.' })
    if (err.code === '23503') return res.status(404).json({ error: 'Parfum introuvable' })
    throw err
  }
  res.status(201).json({ item: await findItem(req.user.id, data.perfumeId) })
})

// PATCH /api/collection/:perfumeId  { status?, rating?, personalNote? }
router.patch('/:perfumeId', async (req, res) => {
  const perfumeId = parseId(req.params.perfumeId)
  if (!perfumeId) return res.status(400).json({ error: 'Identifiant invalide' })
  const data = parseBody(updateSchema, req, res)
  if (!data) return

  // Seuls les champs envoyés sont modifiés (noms de colonnes fixes, valeurs paramétrées)
  const columns = { status: 'status', rating: 'rating', personalNote: 'note_perso' }
  const keys = Object.keys(data)
  const { rowCount } = await pool.query(
    `UPDATE collection_items SET ${keys.map((key, i) => `${columns[key]} = $${i + 3}`).join(', ')}
     WHERE user_id = $1 AND perfume_id = $2`,
    [req.user.id, perfumeId, ...keys.map((key) => data[key])],
  )
  if (!rowCount) return res.status(404).json({ error: "Ce parfum n'est pas dans votre collection." })
  res.json({ item: await findItem(req.user.id, perfumeId) })
})

// DELETE /api/collection/:perfumeId
router.delete('/:perfumeId', async (req, res) => {
  const perfumeId = parseId(req.params.perfumeId)
  if (!perfumeId) return res.status(400).json({ error: 'Identifiant invalide' })
  const { rowCount } = await pool.query(
    'DELETE FROM collection_items WHERE user_id = $1 AND perfume_id = $2',
    [req.user.id, perfumeId],
  )
  if (!rowCount) return res.status(404).json({ error: "Ce parfum n'est pas dans votre collection." })
  res.status(204).end()
})

export default router
