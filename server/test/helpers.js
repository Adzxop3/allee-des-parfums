// Outils communs aux tests de l'API
import './env.js'
import { app } from '../src/app.js'
import { pool } from '../src/db.js'
import { outbox } from '../src/mailer.js'

export { pool }

// Démarre l'API sur un port libre
export function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve({ base: `http://localhost:${server.address().port}`, close: () => server.close() })
    })
  })
}

// Client HTTP qui garde son cookie de session, comme un navigateur, et a sa propre adresse IP
let clients = 0
export class Client {
  constructor(base) {
    this.base = base
    this.cookie = ''
    clients++
    this.ip = `10.${process.pid % 250}.${Math.floor(clients / 250)}.${clients % 250}`
  }

  async request(method, path, body) {
    const res = await fetch(this.base + path, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(this.cookie && { Cookie: this.cookie }),
        'X-Forwarded-For': this.ip,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
    for (const header of res.headers.getSetCookie()) {
      const [pair] = header.split(';')
      if (pair.startsWith('sid=')) this.cookie = pair === 'sid=' ? '' : pair
    }
    const text = await res.text()
    return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null }
  }

  get = (path) => this.request('GET', path)
  post = (path, body = {}) => this.request('POST', path, body)
  put = (path, body = {}) => this.request('PUT', path, body)
  patch = (path, body = {}) => this.request('PATCH', path, body)
  delete = (path, body) => this.request('DELETE', path, body)
}

// Dernier email reçu par une adresse, dont le texte correspond à pattern
// (les emails partent après la réponse : on attend un peu)
export async function lastEmail(to, pattern = /./) {
  for (let i = 0; i < 40; i++) {
    const mail = outbox.findLast((m) => m.to === to && pattern.test(m.text))
    if (mail) return mail
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error(`Aucun email pour ${to}`)
}

// Jeton contenu dans le lien d'un email (…?token=xxx)
export const tokenIn = (mail) => mail.text.match(/token=([\w-]+)/)[1]

// Nouveau membre inscrit et connecté ; verified : adresse email confirmée (par le vrai lien reçu)
let members = 0
export async function newMember(base, { verified = true, displayName } = {}) {
  members++
  const client = new Client(base)
  const email = `membre${members}-${process.pid}-${Date.now()}@example.com`
  const password = 'motdepasse-de-test'
  const res = await client.post('/api/auth/register', { email, password, displayName: displayName ?? `Membre ${members}` })
  if (res.status !== 201) throw new Error(`Inscription refusée : ${JSON.stringify(res.body)}`)
  if (verified) {
    const verify = await client.post('/api/auth/verify-email', { token: tokenIn(await lastEmail(email, /verifier-email/)) })
    if (verify.status !== 200) throw new Error('Confirmation refusée')
  }
  return { client, email, password, id: res.body.user.id }
}

// Deux parfums du jeu fictif (identifiants fixes, voir fixtures/make-fixture.js)
export const PERFUME = 900001
export const OTHER_PERFUME = 900002

// Texte d'avis valide (30 caractères au moins), différent à chaque appel, même d'un fichier de test
// à l'autre (l'anti-spam refuse les répétitions)
let reviews = 0
export const reviewBody = () =>
  `Avis de test ${process.pid}-${++reviews} : tenue correcte, sillage discret, agréable le soir.`
