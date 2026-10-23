import { Router } from 'express'
import { pool } from '../db.js'
import { getPagination, parseId } from '../pagination.js'
import { COMMUNITY_JOIN, RATING_COLUMNS } from '../ratings.js'

// Profils publics des membres. N'expose jamais l'email : seulement le pseudo, la date d'inscription,
// les avis publiés et, si le membre l'a choisi, ses parfums favoris.
const router = Router()

const PAGE_SIZE = 10
const MAX_FAVORITES = 24

// GET /api/members/:id
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })

  const { rows } = await pool.query(
    `SELECT u.id, u.display_name AS "displayName", u.created_at AS "memberSince", u.show_favorites,
            (SELECT count(*)::int FROM reviews r WHERE r.user_id = u.id AND r.status = 'published') AS "reviewCount"
     FROM users u WHERE u.id = $1`,
    [id],
  )
  if (!rows.length) return res.status(404).json({ error: 'Membre introuvable' })
  const { show_favorites: showFavorites, ...member } = rows[0]

  // Favoris = parfums notés 5 étoiles dans la parfumothèque, seulement si le membre les rend publics
  let favorites = null
  if (showFavorites) {
    const { rows: perfumes } = await pool.query(
      `SELECT p.id, p.name, b.name AS brand, p.year, p.gender, p.image_url, ${RATING_COLUMNS}
       FROM collection_items ci
       JOIN perfumes p ON p.id = ci.perfume_id
       LEFT JOIN brands b ON b.id = p.brand_id
       ${COMMUNITY_JOIN}
       WHERE ci.user_id = $1 AND ci.rating = 5
       ORDER BY ci.added_at DESC
       LIMIT ${MAX_FAVORITES}`,
      [id],
    )
    favorites = perfumes
  }

  res.json({ ...member, favorites })
})

// GET /api/members/:id/reviews?page= : avis publiés du membre, les plus récents d'abord
router.get('/:id/reviews', async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })
  const { page, offset } = getPagination({ ...req.query, limit: PAGE_SIZE })

  const { rows: countRows } = await pool.query(
    "SELECT count(*)::int AS total FROM reviews WHERE user_id = $1 AND status = 'published'",
    [id],
  )
  const { rows } = await pool.query(
    `SELECT r.id, r.rating, r.title, r.body, r.created_at AS "createdAt", r.updated_at AS "updatedAt",
            json_build_object('id', u.id, 'displayName', u.display_name) AS author,
            json_build_object('id', p.id, 'name', p.name, 'brand', b.name, 'image_url', p.image_url) AS perfume
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     JOIN perfumes p ON p.id = r.perfume_id
     LEFT JOIN brands b ON b.id = p.brand_id
     WHERE r.user_id = $1 AND r.status = 'published'
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    [id],
  )
  res.json({ page, limit: PAGE_SIZE, total: countRows[0].total, reviews: rows })
})

export default router
