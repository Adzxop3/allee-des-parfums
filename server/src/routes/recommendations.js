import { Router } from 'express'
import { requireVerifiedEmail } from '../auth.js'
import { pool } from '../db.js'
import { answersSchema, loadCandidates, recommend } from '../recommend.js'
import { parseBody } from '../validate.js'

const router = Router()

// GET /api/recommendations/options : exemples de parfums connus pour chaque grande famille
router.get('/options', async (req, res) => {
  const { examples } = await loadCandidates()
  res.json({ examples })
})

// POST /api/recommendations  { forWhom, families, likedNotes, dislikedNotes, season, time, intensity, popularity, excludeOwned }
// Utilisable sans compte. Connecté avec un email confirmé : excludeOwned écarte les parfums « Je l'ai ».
router.post('/', async (req, res) => {
  const answers = parseBody(answersSchema, req, res)
  if (!answers) return

  let excludedIds = new Set()
  if (answers.excludeOwned && req.user?.email_verified_at) {
    const { rows } = await pool.query(
      "SELECT perfume_id FROM collection_items WHERE user_id = $1 AND status = 'owned'",
      [req.user.id],
    )
    excludedIds = new Set(rows.map((r) => r.perfume_id))
  }

  const ranked = await recommend(answers, { excludedIds })
  const { rows } = await pool.query(
    `SELECT p.id, p.name, b.name AS brand, p.year, p.gender, p.image_url
     FROM perfumes p LEFT JOIN brands b ON b.id = p.brand_id WHERE p.id = ANY($1)`,
    [ranked.map((r) => r.id)],
  )
  const perfumes = new Map(rows.map((p) => [p.id, p]))
  res.json({ results: ranked.map((r) => ({ ...perfumes.get(r.id), score: r.score, explanation: r.explanation })) })
})

// GET /api/recommendations/preferences : mes réponses sauvegardées ({ answers: null } sinon)
router.get('/preferences', requireVerifiedEmail, async (req, res) => {
  const { rows } = await pool.query('SELECT answers FROM user_preferences WHERE user_id = $1', [req.user.id])
  res.json({ answers: rows[0]?.answers ?? null })
})

// PUT /api/recommendations/preferences  { ...réponses }
router.put('/preferences', requireVerifiedEmail, async (req, res) => {
  const answers = parseBody(answersSchema, req, res)
  if (!answers) return
  await pool.query(
    `INSERT INTO user_preferences (user_id, answers) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET answers = EXCLUDED.answers, updated_at = now()`,
    [req.user.id, answers],
  )
  res.json({ answers })
})

export default router
