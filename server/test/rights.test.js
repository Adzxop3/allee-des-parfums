// Droits d'accès : chaque route vérifie qui fait la demande (visiteur, membre, auteur, modérateur)
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { Client, newMember, OTHER_PERFUME, PERFUME, pool, reviewBody, startServer } from './helpers.js'

let server, visitor, alice, bob, unverified
before(async () => {
  server = await startServer()
  visitor = new Client(server.base)
  alice = await newMember(server.base, { displayName: 'Alice' })
  bob = await newMember(server.base, { displayName: 'Bob' })
  unverified = await newMember(server.base, { verified: false })
})
after(async () => {
  server.close()
  await pool.end()
})

const publish = (member, perfumeId = PERFUME) =>
  member.client.post(`/api/perfumes/${perfumeId}/reviews`, { rating: 4, title: 'Un avis', body: reviewBody() })

describe('visiteur non connecté', () => {
  test('ne peut ni écrire ni lire de données personnelles', async () => {
    const attempts = [
      visitor.get('/api/collection'),
      visitor.post('/api/collection', { perfumeId: PERFUME, status: 'owned' }),
      visitor.post(`/api/perfumes/${PERFUME}/reviews`, { rating: 4, title: 'Un avis', body: reviewBody() }),
      visitor.post('/api/reports', { targetType: 'review', targetId: 1, reason: 'spam' }),
      visitor.get('/api/recommendations/preferences'),
      visitor.delete('/api/auth/account', { password: 'x' }),
    ]
    for (const res of await Promise.all(attempts)) assert.equal(res.status, 401)
  })

  test('peut consulter le catalogue et les avis', async () => {
    assert.equal((await visitor.get(`/api/perfumes/${PERFUME}`)).status, 200)
    assert.equal((await visitor.get(`/api/perfumes/${PERFUME}/reviews`)).status, 200)
  })
})

describe('membre sans adresse confirmée', () => {
  test("n'a pas accès aux fonctions d'écriture", async () => {
    const attempts = [
      unverified.client.get('/api/collection'),
      unverified.client.post(`/api/perfumes/${PERFUME}/reviews`, { rating: 4, title: 'Un avis', body: reviewBody() }),
      unverified.client.post('/api/reports', { targetType: 'review', targetId: 1, reason: 'spam' }),
    ]
    for (const res of await Promise.all(attempts)) assert.equal(res.status, 403)
  })
})

describe("contenus d'un autre membre", () => {
  test("impossible de modifier ou supprimer l'avis d'un autre", async () => {
    const review = (await publish(alice)).body.review
    assert.equal((await bob.client.patch(`/api/reviews/${review.id}`, { title: 'Piraté' })).status, 404)
    assert.equal((await bob.client.delete(`/api/reviews/${review.id}`)).status, 404)
    const { rows } = await pool.query('SELECT title FROM reviews WHERE id = $1', [review.id])
    assert.equal(rows[0].title, 'Un avis')
  })

  test("impossible de supprimer le commentaire d'un autre", async () => {
    const review = (await publish(alice, OTHER_PERFUME)).body.review
    const comment = await alice.client.post(`/api/reviews/${review.id}/comments`, { body: 'Merci pour vos retours !' })
    assert.equal(comment.status, 201)
    const id = comment.body.comment.id
    assert.equal((await bob.client.delete(`/api/comments/${id}`)).status, 404)
    assert.equal((await alice.client.delete(`/api/comments/${id}`)).status, 204)
  })

  test('impossible de voter pour son propre avis', async () => {
    const { rows } = await pool.query('SELECT id FROM reviews WHERE user_id = $1 LIMIT 1', [alice.id])
    assert.equal((await alice.client.post(`/api/reviews/${rows[0].id}/vote`)).status, 403)
    assert.equal((await bob.client.post(`/api/reviews/${rows[0].id}/vote`)).status, 200)
  })

  test('chacun ne voit que sa propre collection', async () => {
    await alice.client.post('/api/collection', { perfumeId: PERFUME, status: 'owned', personalNote: 'Note privée' })
    const mine = await alice.client.get('/api/collection')
    const theirs = await bob.client.get('/api/collection')
    assert.ok(mine.body.items.some((item) => item.id === PERFUME))
    assert.ok(!theirs.body.items.some((item) => item.personalNote === 'Note privée'))
    assert.equal((await bob.client.delete(`/api/collection/${PERFUME}`)).status, 404)
  })
})

describe('modération', () => {
  test('réservée aux administrateurs', async () => {
    assert.equal((await visitor.get('/api/admin/reports')).status, 401)
    assert.equal((await bob.client.get('/api/admin/reports')).status, 403)
    assert.equal((await bob.client.post('/api/admin/moderate', { targetType: 'review', targetId: 1, action: 'delete' })).status, 403)

    await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [bob.id])
    assert.equal((await bob.client.get('/api/admin/reports')).status, 200)
    await pool.query("UPDATE users SET role = 'user' WHERE id = $1", [bob.id])
  })

  test("un avis masqué n'est plus visible que par son auteur", async () => {
    const carol = await newMember(server.base, { displayName: 'Carol' })
    const review = (await publish(carol)).body.review
    await bob.client.post('/api/reports', { targetType: 'review', targetId: review.id, reason: 'spam' })

    await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [alice.id])
    const moderate = await alice.client.post('/api/admin/moderate', { targetType: 'review', targetId: review.id, action: 'hide' })
    assert.equal(moderate.status, 200)
    assert.equal(moderate.body.closedReports, 1)

    const ids = async (client) => (await client.get(`/api/perfumes/${PERFUME}/reviews`)).body.reviews.map((r) => r.id)
    assert.ok(!(await ids(visitor)).includes(review.id))
    const mine = await carol.client.get(`/api/perfumes/${PERFUME}/reviews/mine`)
    assert.equal(mine.body.review.status, 'hidden')
  })
})

describe('suppression du compte', () => {
  test('exige le mot de passe et supprime les contenus du membre', async () => {
    const dave = await newMember(server.base, { displayName: 'Dave' })
    const review = (await publish(dave)).body.review
    await dave.client.post('/api/collection', { perfumeId: PERFUME, status: 'wishlist' })

    assert.equal((await dave.client.delete('/api/auth/account', { password: 'mauvais' })).status, 401)
    assert.equal((await dave.client.delete('/api/auth/account', { password: dave.password })).status, 204)

    const { rows } = await pool.query(
      `SELECT (SELECT count(*) FROM users WHERE id = $1)::int AS users,
              (SELECT count(*) FROM reviews WHERE id = $2)::int AS reviews,
              (SELECT count(*) FROM collection_items WHERE user_id = $1)::int AS items`,
      [dave.id, review.id],
    )
    assert.deepEqual(rows[0], { users: 0, reviews: 0, items: 0 })
  })
})
