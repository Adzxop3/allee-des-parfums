// Outils communs aux tests de bout en bout
import '../server/test/env.js'
import { pool } from '../server/src/db.js'

export { pool }

// Parfums du jeu fictif (server/test/fixtures)
export const PERFUME = { id: 900003, name: 'Velours Secrète' }

// Crée un membre et le connecte dans le navigateur de la page (même cookie de session).
// verified : adresse confirmée directement en base (le parcours de confirmation est testé côté API)
let members = 0
export async function signIn(page, { verified = true } = {}) {
  members++
  const email = `e2e-${members}-${Date.now()}@example.com`
  const res = await page.request.post('/api/auth/register', {
    data: { email, password: 'motdepasse-e2e', displayName: `Testeur ${members}` },
  })
  if (!res.ok()) throw new Error(`Inscription refusée : ${await res.text()}`)
  if (verified) await pool.query('UPDATE users SET email_verified_at = now() WHERE email = $1', [email])
  return { email, displayName: `Testeur ${members}` }
}
