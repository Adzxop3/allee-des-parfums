import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin, requireVerifiedEmail } from '../auth.js'
import { pool } from '../db.js'
import { getPagination } from '../pagination.js'
import { cleanText } from '../text.js'
import { limiter, perUser } from '../rateLimit.js'
import { parseBody } from '../validate.js'

// Signalements (membres à l'email confirmé) et modération (rôle admin).
const router = Router()

const TABLES = { review: 'reviews', comment: 'comments' } // type de contenu -> table (liste fixe)
const LOG_PAGE_SIZE = 20

const optionalText = (max) =>
  z
    .string({ error: 'Texte invalide' })
    .transform(cleanText)
    .pipe(z.string().max(max, { error: `${max} caractères maximum` }))
    .optional()
    .transform((text) => text || null)

const target = {
  targetType: z.enum(['review', 'comment'], { error: 'Type de contenu invalide' }),
  targetId: z.number({ error: 'Contenu invalide' }).int().positive(),
}
const reportSchema = z.object({
  ...target,
  reason: z.enum(['spam', 'abuse', 'off_topic', 'other'], { error: 'Choisissez un motif' }),
  details: optionalText(500),
})
const moderateSchema = z.object({
  ...target,
  action: z.enum(['hide', 'delete', 'ignore'], { error: 'Action invalide' }),
  note: optionalText(500),
})

// Le contenu visé, avec son auteur et le parfum concerné (null s'il n'existe plus)
async function findTarget(type, id) {
  const query =
    type === 'review'
      ? `SELECT r.id, r.user_id, r.status, r.title, r.body, r.created_at, r.perfume_id, p.name AS perfume_name,
                u.display_name AS author_name
         FROM reviews r JOIN users u ON u.id = r.user_id JOIN perfumes p ON p.id = r.perfume_id
         WHERE r.id = $1`
      : `SELECT c.id, c.user_id, c.status, NULL AS title, c.body, c.created_at, r.perfume_id,
                p.name AS perfume_name, u.display_name AS author_name
         FROM comments c JOIN users u ON u.id = c.user_id
         JOIN reviews r ON r.id = c.review_id JOIN perfumes p ON p.id = r.perfume_id
         WHERE c.id = $1`
  const { rows } = await pool.query(query, [id])
  return rows[0] ?? null
}

// 10 signalements acceptés par heure et par membre
const reportLimit = limiter({
  minutes: 60,
  limit: 10,
  message: 'Trop de signalements envoyés.',
  keyGenerator: perUser,
  skipFailedRequests: true,
})

// POST /api/reports  { targetType, targetId, reason, details? }
router.post('/reports', requireVerifiedEmail, reportLimit, async (req, res) => {
  const data = parseBody(reportSchema, req, res)
  if (!data) return

  const content = await findTarget(data.targetType, data.targetId)
  if (!content || content.status !== 'published') return res.status(404).json({ error: 'Contenu introuvable' })
  if (content.user_id === req.user.id) {
    return res.status(403).json({ error: 'Vous ne pouvez pas signaler votre propre contenu.' })
  }

  try {
    await pool.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, details) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, data.targetType, data.targetId, data.reason, data.details],
    )
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Vous avez déjà signalé ce contenu : il est en cours d’examen.' })
    }
    throw err
  }
  res.status(201).json({ reported: true })
})

// GET /api/admin/reports : signalements en attente, regroupés par contenu (les plus signalés d'abord)
router.get('/admin/reports', requireAdmin, async (req, res) => {
  const { rows: groups } = await pool.query(
    `SELECT rp.target_type AS "targetType", rp.target_id AS "targetId", count(*)::int AS count,
            min(rp.created_at) AS "firstReportedAt",
            json_agg(json_build_object('reason', rp.reason, 'details', rp.details, 'createdAt', rp.created_at,
                                       'reporter', u.display_name) ORDER BY rp.created_at) AS reports
     FROM reports rp JOIN users u ON u.id = rp.reporter_id
     WHERE NOT rp.resolved
     GROUP BY rp.target_type, rp.target_id
     ORDER BY count DESC, "firstReportedAt"`,
  )

  const results = []
  for (const group of groups) {
    const content = await findTarget(group.targetType, group.targetId)
    results.push({
      ...group,
      // null : le contenu a déjà été supprimé (par son auteur par exemple)
      content: content && {
        title: content.title,
        body: content.body,
        status: content.status,
        createdAt: content.created_at,
        author: { id: content.user_id, displayName: content.author_name },
        perfume: { id: content.perfume_id, name: content.perfume_name },
      },
    })
  }
  res.json({ groups: results })
})

// POST /api/admin/moderate  { targetType, targetId, action: hide|delete|ignore, note? }
// Applique la décision, clôt les signalements en attente sur ce contenu et l'inscrit au journal.
router.post('/admin/moderate', requireAdmin, async (req, res) => {
  const data = parseBody(moderateSchema, req, res)
  if (!data) return

  const content = await findTarget(data.targetType, data.targetId)
  if (!content && data.action !== 'ignore') {
    return res.status(404).json({ error: 'Contenu introuvable : il a peut-être déjà été supprimé.' })
  }
  const table = TABLES[data.targetType]
  const excerpt = content ? [content.title, content.body].filter(Boolean).join(' — ').slice(0, 200) : null

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (data.action === 'hide') await client.query(`UPDATE ${table} SET status = 'hidden' WHERE id = $1`, [data.targetId])
    if (data.action === 'delete') await client.query(`DELETE FROM ${table} WHERE id = $1`, [data.targetId])
    const { rowCount: closed } = await client.query(
      'UPDATE reports SET resolved = true WHERE target_type = $1 AND target_id = $2 AND NOT resolved',
      [data.targetType, data.targetId],
    )
    await client.query(
      `INSERT INTO moderation_log (admin_id, target_type, target_id, action, excerpt, note, reports)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, data.targetType, data.targetId, data.action, excerpt, data.note, closed],
    )
    await client.query('COMMIT')
    res.json({ done: true, closedReports: closed })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// GET /api/admin/log?page= : journal des décisions, les plus récentes d'abord
router.get('/admin/log', requireAdmin, async (req, res) => {
  const { page, offset } = getPagination({ ...req.query, limit: LOG_PAGE_SIZE })
  const { rows: countRows } = await pool.query('SELECT count(*)::int AS total FROM moderation_log')
  const { rows } = await pool.query(
    `SELECT l.id, l.target_type AS "targetType", l.target_id AS "targetId", l.action, l.excerpt, l.note,
            l.reports, l.created_at AS "createdAt", u.display_name AS "adminName"
     FROM moderation_log l LEFT JOIN users u ON u.id = l.admin_id
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT ${LOG_PAGE_SIZE} OFFSET ${offset}`,
  )
  res.json({ page, limit: LOG_PAGE_SIZE, total: countRows[0].total, entries: rows })
})

export default router
