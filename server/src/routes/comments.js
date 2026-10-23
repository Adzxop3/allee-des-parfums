import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireVerifiedEmail } from '../auth.js'
import { pool } from '../db.js'
import { parseId } from '../pagination.js'
import { textField } from '../text.js'
import { isRepeated, spamProblem } from '../antispam.js'
import { limiter, perUser } from '../rateLimit.js'
import { parseBody } from '../validate.js'

// Commentaires en réponse à un avis (un seul niveau). Lecture publique ;
// écriture réservée aux comptes à l'email confirmé ; suppression par l'auteur uniquement.
const router = Router()

const commentSchema = z.object({ body: textField('Commentaire', 2, 1000) })

// Colonnes renvoyées pour un commentaire (jamais l'email de l'auteur)
const COMMENT_COLUMNS = `c.id, c.review_id AS "reviewId", c.body, c.status, c.created_at AS "createdAt",
  json_build_object('id', u.id, 'displayName', u.display_name) AS author`

// L'avis existe et est visible (publié, ou c'est celui du visiteur)
async function visibleReview(reviewId, viewerId) {
  const { rows } = await pool.query(
    "SELECT id FROM reviews WHERE id = $1 AND (status = 'published' OR user_id = $2)",
    [reviewId, viewerId],
  )
  return rows.length > 0
}

// GET /api/reviews/:id/comments — du plus ancien au plus récent ; le visiteur voit aussi ses
// commentaires masqués par la modération (avec leur statut)
router.get('/reviews/:id/comments', async (req, res) => {
  const reviewId = parseId(req.params.id)
  if (!reviewId) return res.status(400).json({ error: 'Identifiant invalide' })
  const viewerId = req.user?.id ?? null
  if (!(await visibleReview(reviewId, viewerId))) return res.status(404).json({ error: 'Avis introuvable' })

  const { rows } = await pool.query(
    `SELECT ${COMMENT_COLUMNS}
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.review_id = $1 AND (c.status = 'published' OR c.user_id = $2)
     ORDER BY c.created_at, c.id`,
    [reviewId, viewerId],
  )
  res.json({ comments: rows })
})

// 10 commentaires publiés par 10 minutes et par membre (les refus ne comptent pas)
const createLimit = limiter({
  minutes: 10,
  limit: 10,
  message: 'Trop de commentaires publiés.',
  keyGenerator: perUser,
  skipFailedRequests: true,
})

// POST /api/reviews/:id/comments  { body }
router.post('/reviews/:id/comments', requireVerifiedEmail, createLimit, async (req, res) => {
  const reviewId = parseId(req.params.id)
  if (!reviewId) return res.status(400).json({ error: 'Identifiant invalide' })
  const data = parseBody(commentSchema, req, res)
  if (!data) return
  // Anti-spam : texte suspect, ou déjà publié par ce membre (30 jours) ou par un autre (24 heures)
  const problem =
    spamProblem(data.body) ??
    ((await isRepeated('comments', req.user.id, data.body)) ? 'Vous avez déjà publié ce message.' : null)
  if (problem) return res.status(400).json({ error: problem, fields: { body: problem } })
  if (!(await visibleReview(reviewId, req.user.id))) return res.status(404).json({ error: 'Avis introuvable' })

  const { rows } = await pool.query(
    'INSERT INTO comments (user_id, review_id, body) VALUES ($1, $2, $3) RETURNING id',
    [req.user.id, reviewId, data.body],
  )
  const { rows: created } = await pool.query(
    `SELECT ${COMMENT_COLUMNS} FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
    [rows[0].id],
  )
  res.status(201).json({ comment: created[0] })
})

// DELETE /api/comments/:id — uniquement son propre commentaire
router.delete('/comments/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })
  const { rowCount } = await pool.query('DELETE FROM comments WHERE id = $1 AND user_id = $2', [id, req.user.id])
  if (!rowCount) return res.status(404).json({ error: 'Commentaire introuvable' })
  res.status(204).end()
})

export default router
