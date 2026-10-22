import { hash, verify } from '@node-rs/argon2'
import { Router } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import {
  consumeAuthToken,
  createAuthToken,
  createSession,
  destroySession,
  publicUser,
  requireAuth,
  SESSION_COOKIE,
} from '../auth.js'
import { pool } from '../db.js'
import { APP_URL, sendMail } from '../mailer.js'
import { parseBody } from '../validate.js'

const router = Router()

const USER_COLUMNS = 'id, email, display_name, created_at, email_verified_at'
const VERIFY_HOURS = 24
const RESET_HOURS = 1

// --- Validation des entrées ---

const email = z
  .string({ error: 'Adresse email requise' })
  .trim()
  .toLowerCase()
  .max(254, { error: 'Adresse email trop longue' })
  .pipe(z.email({ error: 'Adresse email invalide' }))

const newPassword = z
  .string({ error: 'Mot de passe requis' })
  .min(8, { error: 'Au moins 8 caractères' })
  .max(128, { error: '128 caractères au maximum' })

const token = z.string({ error: 'Lien invalide' }).min(1, { error: 'Lien invalide' }).max(100)

const registerSchema = z.object({
  email,
  password: newPassword,
  displayName: z
    .string({ error: 'Nom requis' })
    .trim()
    .min(1, { error: 'Nom requis' })
    .max(50, { error: '50 caractères au maximum' }),
})
const loginSchema = z.object({
  email,
  password: z.string({ error: 'Mot de passe requis' }).min(1, { error: 'Mot de passe requis' }).max(128),
})
const forgotSchema = z.object({ email })
const deleteSchema = z.object({
  password: z.string({ error: 'Mot de passe requis' }).min(1, { error: 'Mot de passe requis' }).max(128),
})
const resetSchema = z.object({ token, password: newPassword })
const verifySchema = z.object({ token })

// --- Limitation des tentatives ---

function limiter({ minutes, limit, message, keyGenerator, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    keyGenerator,
    skipSuccessfulRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      const wait = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 60000))
      res.status(429).json({ error: `${message} Réessayez dans ${wait} min.` })
    },
  })
}
const bodyEmail = (req) => String(req.body?.email ?? '').trim().toLowerCase()

// Connexion : seuls les échecs comptent. 5 par compte visé (et par IP), 20 par IP.
const loginPerAccount = limiter({
  minutes: 15,
  limit: 5,
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives de connexion.',
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${bodyEmail(req)}`,
})
const loginPerIp = limiter({ minutes: 15, limit: 20, skipSuccessfulRequests: true, message: 'Trop de tentatives de connexion.' })
// Inscriptions : 10 essais par heure et par IP
const registerPerIp = limiter({ minutes: 60, limit: 10, message: "Trop de tentatives d'inscription." })
// Mot de passe oublié : 5 demandes par heure et par IP, 3 par adresse email
const forgotPerIp = limiter({ minutes: 60, limit: 5, message: 'Trop de demandes.' })
const forgotPerEmail = limiter({ minutes: 60, limit: 3, message: 'Trop de demandes.', keyGenerator: bodyEmail })
// Renvoi de l'email de confirmation : 3 par heure et par compte
const resendPerUser = limiter({
  minutes: 60,
  limit: 3,
  message: "Trop d'emails envoyés.",
  keyGenerator: (req) => `user-${req.user?.id}`,
})

// Suppression du compte : 5 essais de mot de passe par 15 minutes et par compte
const deletePerUser = limiter({
  minutes: 15,
  limit: 5,
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives.',
  keyGenerator: (req) => `user-${req.user?.id}`,
})

// --- Emails ---

async function sendVerificationEmail(user) {
  const link = `${APP_URL}/verifier-email?token=${await createAuthToken(user.id, 'verify_email', VERIFY_HOURS)}`
  await sendMail({
    to: user.email,
    subject: 'Confirmez votre adresse email',
    text: `Bonjour ${user.display_name},\n\nPour confirmer votre adresse email, ouvrez ce lien (valable ${VERIFY_HOURS} heures) :\n${link}\n\nSi vous n'avez pas créé de compte, ignorez cet email.`,
  })
}

async function sendResetEmail(user) {
  const link = `${APP_URL}/reinitialiser-mot-de-passe?token=${await createAuthToken(user.id, 'reset_password', RESET_HOURS)}`
  await sendMail({
    to: user.email,
    subject: 'Réinitialisation de votre mot de passe',
    text: `Bonjour ${user.display_name},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable ${RESET_HOURS} heure) :\n${link}\n\nSi vous n'avez rien demandé, ignorez cet email : votre mot de passe ne change pas.`,
  })
}

// Un email qui ne part pas ne doit pas faire échouer la requête : on le signale dans les logs
const sendInBackground = (promise) => promise.catch((err) => console.error('Envoi d’email impossible :', err))

// Hash factice : on vérifie quand même un mot de passe quand l'email est inconnu,
// pour que le temps de réponse ne révèle pas si un compte existe
const dummyHash = hash('mot de passe factice pour égaliser les temps de réponse')

// --- Routes ---

// POST /api/auth/register  { email, password, displayName }
router.post('/register', registerPerIp, async (req, res) => {
  const data = parseBody(registerSchema, req, res)
  if (!data) return

  const passwordHash = await hash(data.password) // argon2id, paramètres recommandés par défaut
  let user
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING ${USER_COLUMNS}`,
      [data.email, passwordHash, data.displayName],
    )
    user = rows[0]
  } catch (err) {
    if (err.code === '23505') {
      // violation de l'unicité de l'email
      return res.status(409).json({
        error: 'Cette adresse email est déjà utilisée.',
        fields: { email: 'Cette adresse email est déjà utilisée' },
      })
    }
    throw err
  }

  await createSession(res, user.id)
  sendInBackground(sendVerificationEmail(user))
  res.status(201).json({ user: publicUser(user) })
})

// POST /api/auth/login  { email, password }
router.post('/login', loginPerIp, loginPerAccount, async (req, res) => {
  const data = parseBody(loginSchema, req, res)
  if (!data) return

  const { rows } = await pool.query(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`, [
    data.email,
  ])
  const user = rows[0]
  const valid = await verify(user?.password_hash ?? (await dummyHash), data.password)
  if (!user || !valid) {
    // Même message que l'email existe ou non
    return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
  }

  await createSession(res, user.id)
  res.json({ user: publicUser(user) })
})

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  await destroySession(req, res)
  res.status(204).end()
})

// GET /api/auth/me : l'utilisateur connecté (401 sinon)
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

// POST /api/auth/verify-email  { token }
router.post('/verify-email', async (req, res) => {
  const data = parseBody(verifySchema, req, res)
  if (!data) return

  const userId = await consumeAuthToken(data.token, 'verify_email')
  if (!userId) return res.status(400).json({ error: 'Ce lien est invalide ou a expiré.' })

  await pool.query('UPDATE users SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1', [
    userId,
  ])
  res.json({ verified: true })
})

// POST /api/auth/resend-verification : nouvel email de confirmation pour l'utilisateur connecté
router.post('/resend-verification', requireAuth, resendPerUser, async (req, res) => {
  if (req.user.email_verified_at) return res.json({ sent: false, alreadyVerified: true })
  await sendVerificationEmail(req.user)
  res.json({ sent: true })
})

// POST /api/auth/forgot-password  { email }
// Toujours la même réponse, que le compte existe ou non (on ne révèle pas les inscrits)
router.post('/forgot-password', forgotPerIp, forgotPerEmail, async (req, res) => {
  const data = parseBody(forgotSchema, req, res)
  if (!data) return

  const { rows } = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE email = $1`, [data.email])
  if (rows.length) sendInBackground(sendResetEmail(rows[0]))
  res.json({ message: 'Si un compte existe pour cette adresse, un email vient de lui être envoyé.' })
})

// POST /api/auth/reset-password  { token, password }
router.post('/reset-password', async (req, res) => {
  const data = parseBody(resetSchema, req, res)
  if (!data) return

  const userId = await consumeAuthToken(data.token, 'reset_password')
  if (!userId) return res.status(400).json({ error: 'Ce lien est invalide ou a expiré.' })

  // Nouveau mot de passe ; l'adresse est confirmée (le lien est arrivé dans la boîte mail).
  // Toutes les sessions sont fermées : un éventuel intrus est déconnecté partout.
  await pool.query(
    `UPDATE users SET password_hash = $1, email_verified_at = coalesce(email_verified_at, now())
     WHERE id = $2`,
    [await hash(data.password), userId],
  )
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId])
  res.json({ reset: true })
})

// DELETE /api/auth/account  { password }
// Supprime le compte et toutes ses données : sessions, liens envoyés par email, parfumothèque et
// préférences disparaissent avec l'utilisateur (clés étrangères ON DELETE CASCADE).
// Le mot de passe est redemandé : une session restée ouverte ne suffit pas pour tout effacer.
router.delete('/account', requireAuth, deletePerUser, async (req, res) => {
  const data = parseBody(deleteSchema, req, res)
  if (!data) return

  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
  if (!(await verify(rows[0].password_hash, data.password))) {
    return res.status(401).json({ error: 'Mot de passe incorrect.', fields: { password: 'Mot de passe incorrect' } })
  }

  await pool.query('DELETE FROM users WHERE id = $1', [req.user.id])
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.status(204).end()
})

export default router
