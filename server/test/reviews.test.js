// Avis, votes « utile » et commentaires
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { Client, newMember, pool, reviewBody, startServer } from './helpers.js'

let server, visitor
before(async () => {
  server = await startServer()
  visitor = new Client(server.base)
})
after(async () => {
  server.close()
  await pool.end()
})

// Chaque test prend son propre parfum du jeu fictif (900010, 900011...) : les résultats ne se mélangent pas
let nextPerfume = 900010
const freshPerfume = () => nextPerfume++

describe('publier un avis', () => {
  test("l'avis publié apparaît sur la fiche et dans la note des membres", async () => {
    const perfumeId = freshPerfume()
    const alice = await newMember(server.base)
    const bob = await newMember(server.base)
    const res = await alice.client.post(`/api/perfumes/${perfumeId}/reviews`, { rating: 4, title: 'Très beau', body: reviewBody() })
    assert.equal(res.status, 201)
    assert.equal(res.body.review.author.displayName.startsWith('Membre'), true)
    assert.equal(res.body.review.author.email, undefined) // jamais l'email de l'auteur
    await bob.client.post(`/api/perfumes/${perfumeId}/reviews`, { rating: 2, title: 'Pas pour moi', body: reviewBody() })

    const list = await visitor.get(`/api/perfumes/${perfumeId}/reviews`)
    assert.equal(list.body.total, 2)
    assert.deepEqual(list.body.summary, { count: 2, average: 3 })
    const perfume = await visitor.get(`/api/perfumes/${perfumeId}`)
    assert.deepEqual(perfume.body.community, { count: 2, average: 3 })
  })

  test('un seul avis par membre et par parfum', async () => {
    const perfumeId = freshPerfume()
    const { client } = await newMember(server.base)
    await client.post(`/api/perfumes/${perfumeId}/reviews`, { rating: 5, title: 'Premier', body: reviewBody() })
    const again = await client.post(`/api/perfumes/${perfumeId}/reviews`, { rating: 1, title: 'Second', body: reviewBody() })
    assert.equal(again.status, 409)
  })

  test('valide la note, le titre et le texte', async () => {
    const { client } = await newMember(server.base)
    const res = await client.post(`/api/perfumes/${freshPerfume()}/reviews`, { rating: 6, title: 'x', body: 'Trop court' })
    assert.equal(res.status, 400)
    assert.deepEqual(Object.keys(res.body.fields).sort(), ['body', 'rating', 'title'])
  })

  test('parfum inexistant : 404', async () => {
    const { client } = await newMember(server.base)
    const res = await client.post('/api/perfumes/1/reviews', { rating: 4, title: 'Titre', body: reviewBody() })
    assert.equal(res.status, 404)
  })

  test('le texte reste du texte brut, sans caractères invisibles', async () => {
    const { client } = await newMember(server.base)
    const invisible = String.fromCharCode(0x200b)
    const body = `<script>alert("x")</script> Un avis${invisible} avec du HTML qui doit rester du texte.`
    const res = await client.post(`/api/perfumes/${freshPerfume()}/reviews`, { rating: 3, title: '  <b>Titre</b>  ', body })
    assert.equal(res.status, 201)
    assert.equal(res.body.review.title, '<b>Titre</b>')
    assert.equal(res.body.review.body, body.replace(invisible, ''))
  })
})

describe('modifier et supprimer son avis', () => {
  test('modification puis suppression', async () => {
    const perfumeId = freshPerfume()
    const { client } = await newMember(server.base)
    const { id } = (await client.post(`/api/perfumes/${perfumeId}/reviews`, { rating: 3, title: 'Avant', body: reviewBody() })).body.review

    const updated = await client.patch(`/api/reviews/${id}`, { rating: 5, title: 'Après' })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.review.rating, 5)
    assert.equal(updated.body.review.title, 'Après')
    assert.ok(updated.body.review.updatedAt > updated.body.review.createdAt)

    assert.equal((await client.delete(`/api/reviews/${id}`)).status, 204)
    assert.equal((await visitor.get(`/api/perfumes/${perfumeId}/reviews`)).body.total, 0)
  })
})

describe('anti-spam', () => {
  test('refuse un texte déjà publié par le même membre', async () => {
    const { client } = await newMember(server.base)
    const body = reviewBody()
    await client.post(`/api/perfumes/${freshPerfume()}/reviews`, { rating: 4, title: 'Premier', body })
    const copy = await client.post(`/api/perfumes/${freshPerfume()}/reviews`, { rating: 4, title: 'Copie', body: body.toUpperCase() })
    assert.equal(copy.status, 400)
    assert.ok(copy.body.fields.body)
  })

  test('refuse trop de liens et les caractères répétés', async () => {
    const { client } = await newMember(server.base)
    const links = await client.post(`/api/perfumes/${freshPerfume()}/reviews`, {
      rating: 4,
      title: 'Liens',
      body: 'Voir https://a.example https://b.example et https://c.example pour plus de détails.',
    })
    assert.equal(links.status, 400)
    const shouting = await client.post(`/api/perfumes/${freshPerfume()}/reviews`, {
      rating: 4,
      title: 'Génial',
      body: `${reviewBody()} !!!!!!!!!!!!`,
    })
    assert.equal(shouting.status, 400)
  })
})

describe('votes « utile »', () => {
  test('un vote par membre, retirable', async () => {
    const perfumeId = freshPerfume()
    const author = await newMember(server.base)
    const voter = await newMember(server.base)
    const { id } = (await author.client.post(`/api/perfumes/${perfumeId}/reviews`, { rating: 4, title: 'Avis', body: reviewBody() })).body.review

    assert.deepEqual((await voter.client.post(`/api/reviews/${id}/vote`)).body, { helpfulCount: 1, votedByMe: true })
    assert.deepEqual((await voter.client.post(`/api/reviews/${id}/vote`)).body, { helpfulCount: 1, votedByMe: true })
    assert.deepEqual((await voter.client.delete(`/api/reviews/${id}/vote`)).body, { helpfulCount: 0, votedByMe: false })
  })
})

describe('commentaires', () => {
  test('publiés dans l’ordre et paginés par 20', async () => {
    const perfumeId = freshPerfume()
    const author = await newMember(server.base)
    const { id } = (await author.client.post(`/api/perfumes/${perfumeId}/reviews`, { rating: 4, title: 'Avis', body: reviewBody() })).body.review

    // 21 commentaires par 3 membres (chacun est limité à 10 commentaires par 10 minutes)
    const members = [await newMember(server.base), await newMember(server.base), await newMember(server.base)]
    for (let i = 1; i <= 21; i++) {
      const res = await members[i % 3].client.post(`/api/reviews/${id}/comments`, { body: `Commentaire de test numéro ${i}` })
      assert.equal(res.status, 201)
    }

    const page1 = (await visitor.get(`/api/reviews/${id}/comments?page=1`)).body
    const page2 = (await visitor.get(`/api/reviews/${id}/comments?page=2`)).body
    assert.equal(page1.total, 21)
    assert.equal(page1.comments.length, 20)
    assert.equal(page1.comments[0].body, 'Commentaire de test numéro 1')
    assert.deepEqual(page2.comments.map((c) => c.body), ['Commentaire de test numéro 21'])

    const list = await visitor.get(`/api/perfumes/${perfumeId}/reviews`)
    assert.equal(list.body.reviews[0].commentCount, 21)
  })

  test('limite de 10 commentaires par 10 minutes', async () => {
    const author = await newMember(server.base)
    const { id } = (await author.client.post(`/api/perfumes/${freshPerfume()}/reviews`, { rating: 4, title: 'Avis', body: reviewBody() })).body.review
    const { client } = await newMember(server.base)
    for (let i = 1; i <= 10; i++) await client.post(`/api/reviews/${id}/comments`, { body: `Réponse rapide numéro ${i}` })
    const blocked = await client.post(`/api/reviews/${id}/comments`, { body: 'Réponse de trop' })
    assert.equal(blocked.status, 429)
  })
})
