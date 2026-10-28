// En-têtes de sécurité, CORS, CSRF, requêtes mal formées, journaux, cookies, limite générale
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { Client, newMember, pool, startServer } from './helpers.js'
import { outbox, sendMail } from '../src/mailer.js'

let server
before(async () => (server = await startServer()))
after(async () => {
  server.close()
  await pool.end()
})

// Requête brute (en-têtes choisis), avec une adresse IP propre à chaque appel
let ips = 0
const raw = (path, init = {}) =>
  fetch(server.base + path, { ...init, headers: { 'X-Forwarded-For': `172.16.0.${++ips}`, ...init.headers } })

describe('en-têtes de sécurité', () => {
  test('politique de contenu stricte, pas de cadre, pas de signature du serveur', async () => {
    const res = await raw('/api/health')
    const csp = res.headers.get('content-security-policy')
    for (const rule of ["default-src 'self'", "style-src 'self'", "font-src 'self'", "frame-ancestors 'none'", "object-src 'none'"]) {
      assert.ok(csp.includes(rule), rule)
    }
    assert.equal(res.headers.get('x-frame-options'), 'DENY')
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(res.headers.get('x-powered-by'), null)
  })
})

describe('CORS', () => {
  test("aucun autre site n'est autorisé à lire les réponses de l'API", async () => {
    const res = await raw('/api/auth/me', { headers: { Origin: 'https://pirate.example' } })
    assert.equal(res.headers.get('access-control-allow-origin'), null)
    const preflight = await raw('/api/auth/login', {
      method: 'OPTIONS',
      headers: { Origin: 'https://pirate.example', 'Access-Control-Request-Method': 'POST' },
    })
    assert.equal(preflight.headers.get('access-control-allow-origin'), null)
  })
})

describe('CSRF', () => {
  test("une modification demandée par un autre site est refusée", async () => {
    const { client } = await newMember(server.base)
    const forged = await raw('/api/auth/logout', {
      method: 'POST',
      headers: { Origin: 'https://pirate.example', Cookie: client.cookie },
    })
    assert.equal(forged.status, 403)
    assert.ok((await client.get('/api/auth/me')).body.user) // toujours connecté
  })

  test('les requêtes du site lui-même passent', async () => {
    const { client } = await newMember(server.base)
    const res = await raw('/api/auth/logout', { method: 'POST', headers: { Origin: server.base, Cookie: client.cookie } })
    assert.equal(res.status, 204)
  })
})

describe('requêtes mal formées', () => {
  test('JSON invalide : 400 ; corps trop gros : 413 ; rien dans les journaux', async (t) => {
    const logged = t.mock.method(console, 'error', () => {})
    const invalid = await raw('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email": "a@b.c", "password": "secret-dans-un-json-casse',
    })
    assert.equal(invalid.status, 400)
    const big = await raw('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.c', password: 'x'.repeat(30_000) }),
    })
    assert.equal(big.status, 413)
    assert.equal(logged.mock.callCount(), 0)
  })
})

describe('données sensibles', () => {
  test("en production sans SMTP, le contenu d'un email (lien de connexion) n'est pas journalisé", async (t) => {
    const warned = t.mock.method(console, 'warn', () => {})
    const printed = t.mock.method(console, 'log', () => {})
    const before = outbox.length
    process.env.NODE_ENV = 'production'
    try {
      await sendMail({ to: 'a@example.com', subject: 'Réinitialisation', text: 'Lien : /reinitialiser-mot-de-passe?token=SECRET' })
    } finally {
      process.env.NODE_ENV = 'test'
    }
    const output = JSON.stringify([...warned.mock.calls, ...printed.mock.calls].map((c) => c.arguments))
    assert.ok(!output.includes('SECRET'))
    assert.ok(!output.includes('a@example.com'))
    assert.equal(outbox.length, before)
  })

  test("l'API ne renvoie jamais le hash du mot de passe ni l'email des autres membres", async () => {
    const alice = await newMember(server.base)
    const me = await alice.client.get('/api/auth/me')
    assert.equal(me.body.user.password_hash, undefined)
    const profile = await new Client(server.base).get(`/api/members/${alice.id}`)
    assert.equal(JSON.stringify(profile.body).includes(alice.email), false)
  })

  test('en production, le cookie de session est réservé à HTTPS', async () => {
    process.env.NODE_ENV = 'production'
    try {
      const res = await new Client(server.base).post('/api/auth/register', {
        email: `cookie-${Date.now()}@example.com`,
        password: 'motdepasse-solide',
        displayName: 'Cookie',
      })
      const cookie = res.headers.getSetCookie().find((c) => c.startsWith('sid='))
      assert.match(cookie, /; Secure/)
      assert.match(cookie, /HttpOnly/)
    } finally {
      process.env.NODE_ENV = 'test'
    }
  })
})

describe('limite générale', () => {
  test("au-delà de 1 500 requêtes en 15 minutes depuis une même adresse : 429", async () => {
    const client = new Client(server.base)
    let last
    for (let i = 0; i <= 1500; i++) last = await client.get('/api/moods')
    assert.equal(last.status, 429)
    assert.match(last.body.error, /Trop de requêtes/)
    assert.equal((await new Client(server.base).get('/api/moods')).status, 200) // les autres adresses passent
  })
})
