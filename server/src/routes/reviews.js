import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireVerifiedEmail } from '../auth.js'
import { pool } from '../db.js'
import { getPagination, parseId } from '../pagination.js'
import { textField } from '../text.js'
import { isRepeated, spamProblem } from '../antispam.js'
import { limiter, perUser } from '../rateLimit.js'
import { parseBody } from '../validate.js'

// Avis des membres. Lecture publique ; écriture réservée aux comptes à l'email confirmé.
// Chaque modification ou suppression est filtrée par user_id : un membre ne touche qu'à ses avis.
const router = Router()

const PAGE_SIZE = 10

const reviewSchema = z.object({
  rating: z
    .number({ error: 'Note requise' })
    .int({ error: 'Note invalide' })
    .min(1, { error: 'Note de 1 à 5' })
    .max(5, { error: 'Note de 1 à 5' }),
  title: textField('Titre', 3, 100),
  body: textField('Avis', 30, 3000),
})
const updateSchema = reviewSchema.partial().refine((data) => Object.keys(data).length > 0, {
  error: 'Rien à modifier',
})

// Colonnes renvoyées pour un avis (jamais l'email de l'auteur).
// viewerParam : numéro du paramètre SQL qui contient l'id du visiteur (NULL s'il n'est pas connecté)
const reviewColumns = (viewerParam) => `r.id, r.perfume_id AS "perfumeId", r.rating, r.title, r.body, r.status,
  r.created_at AS "createdAt", r.updated_at AS "updatedAt",
  json_build_object('id', u.id, 'displayName', u.display_name) AS author,
  (SELECT count(*) FROM review_votes v WHERE v.review_id = r.id)::int AS "helpfulCount",
  EXISTS (SELECT 1 FROM review_votes v WHERE v.review_id = r.id AND v.user_id = $${viewerParam}) AS "votedByMe",
  (SELECT count(*) FROM comments c WHERE c.review_id = r.id AND c.status = 'published')::int AS "commentCount"`

const SORTS = {
  recent: 'r.created_at DESC, r.id DESC',
  useful: '"helpfulCount" DESC, r.created_at DESC, r.id DESC',
}

async function findReview(id, viewerId = null) {
  const { rows } = await pool.query(
    `SELECT ${reviewColumns(2)} FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.id = $1`,
    [id, viewerId],
  )
  return rows[0] ?? null
}

// Note moyenne et nombre d'avis publiés d'un parfum
export async function reviewSummary(perfumeId) {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS count, round(avg(rating)::numeric, 1)::float AS average
     FROM reviews WHERE perfume_id = $1 AND status = 'published'`,
    [perfumeId],
  )
  return rows[0]
}

// GET /api/perfumes/:id/reviews?page=&sort=recent|useful
// Avis publiés du parfum (10 par page) et résumé (moyenne, nombre)
router.get('/perfumes/:id/reviews', async (req, res) => {
  const perfumeId = parseId(req.params.id)
  if (!perfumeId) return res.status(400).json({ error: 'Identifiant invalide' })
  const { page, offset } = getPagination({ ...req.query, limit: PAGE_SIZE })
  const sort = SORTS[req.query.sort] ? req.query.sort : 'recent'

  const summary = await reviewSummary(perfumeId)
  const { rows } = await pool.query(
    `SELECT ${reviewColumns(2)}
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.perfume_id = $1 AND r.status = 'published'
     ORDER BY ${SORTS[sort]}
     LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    [perfumeId, req.user?.id ?? null],
  )
  res.json({ summary, page, limit: PAGE_SIZE, total: summary.count, sort, reviews: rows })
})

// GET /api/perfumes/:id/reviews/mine : mon avis sur ce parfum, même masqué ({ review: null } sinon)
router.get('/perfumes/:id/reviews/mine', requireAuth, async (req, res) => {
  const perfumeId = parseId(req.params.id)
  if (!perfumeId) return res.status(400).json({ error: 'Identifiant invalide' })
  const { rows } = await pool.query('SELECT id FROM reviews WHERE perfume_id = $1 AND user_id = $2', [
    perfumeId,
    req.user.id,
  ])
  res.json({ review: rows.length ? await findReview(rows[0].id, req.user.id) : null })
})

// Anti-spam : contenu suspect ou déjà publié → erreur 400 sur le champ concerné (true si refusé)
async function rejectSpam(req, res, data, excludeId = null) {
  for (const field of ['title', 'body']) {
    const problem = data[field] && spamProblem(data[field])
    if (problem) {
      res.status(400).json({ error: problem, fields: { [field]: problem } })
      return true
    }
  }
  if (data.body && (await isRepeated('reviews', req.user.id, data.body, excludeId))) {
    const message = 'Ce texte a déjà été publié : écrivez un avis personnel.'
    res.status(400).json({ error: message, fields: { body: message } })
    return true
  }
  return false
}

const createLimit = limiter({
  minutes: 60,
  limit: 5,
  message: "Trop d'avis publiés.",
  keyGenerator: perUser,
  skipFailedRequests: true,
})
const updateLimit = limiter({
  minutes: 60,
  limit: 20,
  message: "Trop de modifications d'avis.",
  keyGenerator: perUser,
  skipFailedRequests: true,
})

// POST /api/perfumes/:id/reviews  { rating, title, body }
router.post('/perfumes/:id/reviews', requireVerifiedEmail, createLimit, async (req, res) => {
  const perfumeId = parseId(req.params.id)
  if (!perfumeId) return res.status(400).json({ error: 'Identifiant invalide' })
  const data = parseBody(reviewSchema, req, res)
  if (!data) return
  if (await rejectSpam(req, res, data)) return

  try {
    const { rows } = await pool.query(
      `INSERT INTO reviews (user_id, perfume_id, rating, title, body) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user.id, perfumeId, data.rating, data.title, data.body],
    )
    res.status(201).json({ review: await findReview(rows[0].id, req.user.id) })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Vous avez déjà donné votre avis sur ce parfum.' })
    if (err.code === '23503') return res.status(404).json({ error: 'Parfum introuvable' })
    throw err
  }
})

// PATCH /api/reviews/:id  { rating?, title?, body? } — uniquement son propre avis
router.patch('/reviews/:id', requireVerifiedEmail, updateLimit, async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })
  const data = parseBody(updateSchema, req, res)
  if (!data) return
  if (await rejectSpam(req, res, data, id)) return

  // Noms de colonnes fixes, valeurs paramétrées
  const keys = Object.keys(data)
  const { rowCount } = await pool.query(
    `UPDATE reviews SET ${keys.map((key, i) => `${key} = $${i + 3}`).join(', ')}, updated_at = now()
     WHERE id = $1 AND user_id = $2`,
    [id, req.user.id, ...keys.map((key) => data[key])],
  )
  // Avis inexistant ou d'un autre membre : même réponse (on ne révèle rien)
  if (!rowCount) return res.status(404).json({ error: 'Avis introuvable' })
  res.json({ review: await findReview(id, req.user.id) })
})

// DELETE /api/reviews/:id — uniquement son propre avis
router.delete('/reviews/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })
  const { rowCount } = await pool.query('DELETE FROM reviews WHERE id = $1 AND user_id = $2', [id, req.user.id])
  if (!rowCount) return res.status(404).json({ error: 'Avis introuvable' })
  res.status(204).end()
})

// Vote « utile » : renvoie le nouveau compteur
async function helpfulState(reviewId, userId) {
  const review = await findReview(reviewId, userId)
  return { helpfulCount: review.helpfulCount, votedByMe: review.votedByMe }
}

// POST /api/reviews/:id/vote — un vote par membre et par avis, pas sur son propre avis
router.post('/reviews/:id/vote', requireVerifiedEmail, async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })
  const { rows } = await pool.query("SELECT user_id FROM reviews WHERE id = $1 AND status = 'published'", [id])
  if (!rows.length) return res.status(404).json({ error: 'Avis introuvable' })
  if (rows[0].user_id === req.user.id) {
    return res.status(403).json({ error: 'Vous ne pouvez pas voter pour votre propre avis.' })
  }

  await pool.query('INSERT INTO review_votes (user_id, review_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
    req.user.id,
    id,
  ])
  res.json(await helpfulState(id, req.user.id))
})

// DELETE /api/reviews/:id/vote — retirer son vote
router.delete('/reviews/:id/vote', requireAuth, async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })
  await pool.query('DELETE FROM review_votes WHERE user_id = $1 AND review_id = $2', [req.user.id, id])
  const review = await findReview(id, req.user.id)
  if (!review) return res.status(404).json({ error: 'Avis introuvable' })
  res.json({ helpfulCount: review.helpfulCount, votedByMe: false })
})

export default router
