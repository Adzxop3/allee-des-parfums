import { createHash, randomBytes } from 'node:crypto'
import { pool } from './db.js'

// Sessions stockées en base ; le navigateur ne garde qu'un jeton aléatoire dans un cookie httpOnly
export const SESSION_COOKIE = 'sid'
const SESSION_DAYS = 30
const RENEW_BELOW_DAYS = 15 // une session active est prolongée quand il lui reste moins que ça
const DAY = 24 * 60 * 60 * 1000

// Seule l'empreinte du jeton est en base : une fuite de la table ne permet pas d'usurper une session
const hashToken = (token) => createHash('sha256').update(token).digest('hex')

function setSessionCookie(res, token, expiresAt) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true, // illisible par le JavaScript de la page
    sameSite: 'lax', // pas envoyé sur les requêtes POST venues d'autres sites (CSRF)
    secure: process.env.NODE_ENV === 'production', // HTTPS uniquement en production
    expires: expiresAt,
    path: '/',
  })
}

export async function createSession(res, userId) {
  // On en profite pour nettoyer les sessions expirées
  await pool.query('DELETE FROM sessions WHERE expires_at < now()')
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY)
  await pool.query('INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)', [
    hashToken(token),
    userId,
    expiresAt,
  ])
  setSessionCookie(res, token, expiresAt)
}

export async function destroySession(req, res) {
  const token = req.cookies[SESSION_COOKIE]
  if (token) await pool.query('DELETE FROM sessions WHERE id = $1', [hashToken(token)])
  res.clearCookie(SESSION_COOKIE, { path: '/' })
}

// Middleware global : renseigne req.user si le cookie correspond à une session valide
export async function loadUser(req, res, next) {
  req.user = null
  const token = req.cookies[SESSION_COOKIE]
  if (!token) return next()

  const id = hashToken(token)
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.display_name, u.created_at, u.email_verified_at, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > now()`,
    [id],
  )
  if (!rows.length) {
    res.clearCookie(SESSION_COOKIE, { path: '/' })
    return next()
  }

  const { expires_at: expiresAt, ...user } = rows[0]
  req.user = user

  // Session glissante : prolongée tant que l'utilisateur revient
  if (expiresAt.getTime() - Date.now() < RENEW_BELOW_DAYS * DAY) {
    const newExpiry = new Date(Date.now() + SESSION_DAYS * DAY)
    await pool.query('UPDATE sessions SET expires_at = $1 WHERE id = $2', [newExpiry, id])
    setSessionCookie(res, token, newExpiry)
  }
  next()
}

// Middleware des routes protégées
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Connexion requise' })
  next()
}

// Middleware des routes réservées aux comptes dont l'email est confirmé (ex. parfumothèque)
export function requireVerifiedEmail(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Connexion requise' })
  if (!req.user.email_verified_at) {
    return res.status(403).json({
      error: 'Confirmez votre adresse email pour utiliser cette fonction.',
      code: 'EMAIL_NOT_VERIFIED',
    })
  }
  next()
}

// Ce que l'API renvoie d'un utilisateur (jamais le hash du mot de passe)
export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    emailVerified: Boolean(user.email_verified_at),
    createdAt: user.created_at,
  }
}

// Jetons à usage unique envoyés par email ('verify_email' ou 'reset_password').
// Un nouveau jeton remplace les précédents du même type.
export async function createAuthToken(userId, purpose, hours) {
  await pool.query('DELETE FROM auth_tokens WHERE user_id = $1 AND purpose = $2', [userId, purpose])
  const token = randomBytes(32).toString('base64url')
  await pool.query(
    `INSERT INTO auth_tokens (id, user_id, purpose, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(hours => $4))`,
    [hashToken(token), userId, purpose, hours],
  )
  return token
}

// Utilise un jeton : il est supprimé dans tous les cas. Renvoie l'id de l'utilisateur, ou null
// si le jeton est inconnu, d'un autre type ou expiré.
export async function consumeAuthToken(token, purpose) {
  const { rows } = await pool.query(
    'DELETE FROM auth_tokens WHERE id = $1 AND purpose = $2 RETURNING user_id, expires_at > now() AS valid',
    [hashToken(token), purpose],
  )
  return rows[0]?.valid ? rows[0].user_id : null
}
