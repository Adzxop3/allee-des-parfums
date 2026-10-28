import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { Client, lastEmail, newMember, pool, PERFUME, reviewBody, startServer, tokenIn } from './helpers.js'

let server
before(async () => (server = await startServer()))
after(async () => {
  server.close()
  await pool.end()
})

describe('inscription', () => {
  test('crée le compte, ouvre une session et envoie le lien de confirmation', async () => {
    const client = new Client(server.base)
    const email = `inscription-${Date.now()}@example.com`
    const res = await client.post('/api/auth/register', { email, password: 'motdepasse-solide', displayName: 'Léa' })
    assert.equal(res.status, 201)
    assert.equal(res.body.user.email, email)
    assert.equal(res.body.user.emailVerified, false)
    assert.equal(res.body.user.password_hash, undefined)

    // Cookie de session : inaccessible au JavaScript de la page, envoyé seulement par ce site
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith('sid='))
    assert.match(cookie, /HttpOnly/i)
    assert.match(cookie, /SameSite=Lax/i)

    const me = await client.get('/api/auth/me')
    assert.equal(me.body.user.email, email)
    assert.match((await lastEmail(email)).text, /verifier-email\?token=/)
  })

  test('le mot de passe est stocké haché avec argon2id', async () => {
    const { email, password } = await newMember(server.base)
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email])
    assert.match(rows[0].password_hash, /^\$argon2id\$/)
    assert.ok(!rows[0].password_hash.includes(password))
  })

  test('refuse une adresse déjà utilisée', async () => {
    const { email } = await newMember(server.base)
    const res = await new Client(server.base).post('/api/auth/register', {
      email: email.toUpperCase(), // même adresse, autre casse
      password: 'motdepasse-solide',
      displayName: 'Doublon',
    })
    assert.equal(res.status, 409)
    assert.ok(res.body.fields.email)
  })

  test('valide les champs côté serveur', async () => {
    const res = await new Client(server.base).post('/api/auth/register', {
      email: 'pas-une-adresse',
      password: 'court',
      displayName: '',
    })
    assert.equal(res.status, 400)
    assert.deepEqual(Object.keys(res.body.fields).sort(), ['displayName', 'email', 'password'])
  })

  test("refuse les pseudos qui imitent l'équipe du site", async () => {
    const res = await new Client(server.base).post('/api/auth/register', {
      email: `admin-${Date.now()}@example.com`,
      password: 'motdepasse-solide',
      displayName: 'Modérateur officiel',
    })
    assert.equal(res.status, 400)
    assert.ok(res.body.fields.displayName)
  })
})

describe('connexion', () => {
  test('connexion, puis déconnexion', async () => {
    const { email, password } = await newMember(server.base)
    const client = new Client(server.base)
    assert.equal((await client.post('/api/auth/login', { email, password })).status, 200)
    assert.equal((await client.get('/api/auth/me')).body.user.email, email)

    assert.equal((await client.post('/api/auth/logout')).status, 204)
    assert.equal((await client.get('/api/auth/me')).body.user, null)
  })

  test('même réponse pour un mauvais mot de passe et un compte inconnu', async () => {
    const { email } = await newMember(server.base)
    const wrong = await new Client(server.base).post('/api/auth/login', { email, password: 'mauvais-mot-de-passe' })
    const unknown = await new Client(server.base).post('/api/auth/login', {
      email: `inconnu-${Date.now()}@example.com`,
      password: 'mauvais-mot-de-passe',
    })
    assert.equal(wrong.status, 401)
    assert.equal(unknown.status, 401)
    assert.equal(wrong.body.error, unknown.body.error)
  })

  test('bloque après 5 échecs sur le même compte', async () => {
    const { email, password } = await newMember(server.base)
    const client = new Client(server.base)
    for (let i = 0; i < 5; i++) await client.post('/api/auth/login', { email, password: 'mauvais-mot-de-passe' })
    const blocked = await client.post('/api/auth/login', { email, password })
    assert.equal(blocked.status, 429)
  })
})

describe("confirmation de l'adresse email", () => {
  test('le lien reçu confirme l’adresse, une seule fois', async () => {
    const { client, email } = await newMember(server.base, { verified: false })
    const token = tokenIn(await lastEmail(email, /verifier-email/))
    assert.equal((await client.post('/api/auth/verify-email', { token })).status, 200)
    assert.equal((await client.get('/api/auth/me')).body.user.emailVerified, true)
    assert.equal((await client.post('/api/auth/verify-email', { token })).status, 400)
  })

  test('sans adresse confirmée, impossible de publier', async () => {
    const { client } = await newMember(server.base, { verified: false })
    const res = await client.post(`/api/perfumes/${PERFUME}/reviews`, { rating: 4, title: 'Titre', body: reviewBody() })
    assert.equal(res.status, 403)
  })
})

describe('mot de passe oublié', () => {
  test('le lien reçu change le mot de passe et ferme les sessions', async () => {
    const { client, email, password } = await newMember(server.base)
    const forgot = await new Client(server.base).post('/api/auth/forgot-password', { email })
    assert.equal(forgot.status, 200)
    const token = tokenIn(await lastEmail(email, /reinitialiser-mot-de-passe/))

    const reset = await new Client(server.base).post('/api/auth/reset-password', { token, password: 'nouveau-mot-de-passe' })
    assert.equal(reset.status, 200)
    assert.equal((await client.get('/api/auth/me')).body.user, null) // ancienne session fermée

    const old = await new Client(server.base).post('/api/auth/login', { email, password })
    assert.equal(old.status, 401)
    const fresh = await new Client(server.base).post('/api/auth/login', { email, password: 'nouveau-mot-de-passe' })
    assert.equal(fresh.status, 200)
  })

  test('même réponse que le compte existe ou non', async () => {
    const res = await new Client(server.base).post('/api/auth/forgot-password', {
      email: `personne-${Date.now()}@example.com`,
    })
    assert.equal(res.status, 200)
  })
})
