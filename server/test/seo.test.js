// Référencement : balises de chaque page, codes 404, robots.txt et sitemap.xml
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { newMember, pool, reviewBody, startServer } from './helpers.js'
import { headTags, pageMeta, SITE_URL } from '../src/seo.js'

let server
before(async () => (server = await startServer()))
after(async () => {
  server.close()
  await pool.end()
})

describe('balises des pages', () => {
  test("fiche parfum : titre, description, image, adresse canonique et données structurées", async () => {
    const perfumeId = 900025 // parfum sans avis : aucun autre test n'en publie sur lui
    const meta = await pageMeta(`/perfumes/${perfumeId}`)
    assert.equal(meta.status, 200)
    assert.equal(meta.title, 'Soleil Noire (Atelier Exemple) · Allée des parfums')
    assert.match(meta.description, /^Soleil Noire d'Atelier Exemple \(\d{4}\), parfum/)
    assert.match(meta.description, /Note Fragrantica : [\d,]+ \/ 5 sur [\d\s ]+ votes\./)
    assert.equal(meta.url, `${SITE_URL}/perfumes/${perfumeId}`)
    assert.equal(meta.jsonLd['@type'], 'Product')
    assert.equal(meta.jsonLd.brand.name, 'Atelier Exemple')
    assert.equal(meta.jsonLd.aggregateRating, undefined) // pas encore d'avis de membre
  })

  test('la note des données structurées vient seulement des avis du site', async () => {
    const perfumeId = 900030
    const { client } = await newMember(server.base)
    await client.post(`/api/perfumes/${perfumeId}/reviews`, { rating: 4, title: 'Avis', body: reviewBody() })
    const meta = await pageMeta(`/perfumes/${perfumeId}`)
    assert.deepEqual(meta.jsonLd.aggregateRating, {
      '@type': 'AggregateRating',
      ratingValue: 4,
      reviewCount: 1,
      bestRating: 5,
      worstRating: 1,
    })
  })

  test('pages inexistantes : 404 et non indexées', async () => {
    for (const path of ['/perfumes/1', '/perfumes/99999999999', '/notes/999999', '/nimporte-quoi']) {
      const meta = await pageMeta(path)
      assert.equal(meta.status, 404, path)
      assert.equal(meta.noindex, true)
    }
  })

  test('pages personnelles et résultats de recherche non indexés', async () => {
    for (const path of ['/connexion', '/compte', '/parfumotheque', '/admin', '/membres/12']) {
      assert.equal((await pageMeta(path)).noindex, true, path)
    }
    assert.equal((await pageMeta('/', { q: 'rose' })).noindex, true)
    assert.equal((await pageMeta('/')).noindex, false)
    assert.equal((await pageMeta('/carte')).noindex, false)
  })

  test('le texte inséré dans le HTML est échappé', () => {
    const html = headTags({
      title: 'Nom "piégé" <img src=x>',
      description: "L'eau & le feu",
      url: `${SITE_URL}/perfumes/1`,
      jsonLd: { name: '</script><script>alert(1)</script>' },
    })
    assert.match(html, /<title>Nom &quot;piégé&quot; &lt;img src=x&gt;<\/title>/)
    assert.match(html, /content="L&#39;eau &amp; le feu"/)
    assert.equal(html.match(/<\/script>/g).length, 1) // seulement la fermeture de la balise JSON-LD
    assert.match(html, /<meta property="og:image" content="[^"]+og-image\.png" \/>/)
  })
})

describe('robots.txt et sitemap.xml', () => {
  test('robots.txt exclut l’API et les pages personnelles', async () => {
    const res = await fetch(`${server.base}/robots.txt`)
    const text = await res.text()
    assert.equal(res.status, 200)
    assert.match(text, /^Disallow: \/api\/$/m)
    assert.match(text, /^Disallow: \/compte$/m)
    assert.match(text, new RegExp(`^Sitemap: ${SITE_URL}/sitemap.xml$`, 'm'))
  })

  test('le sitemap contient les pages fixes et les parfums d’au moins 100 votes', async () => {
    const xml = await (await fetch(`${server.base}/sitemap.xml`)).text()
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])

    const { rows } = await pool.query('SELECT id, rating_count FROM perfumes')
    const popular = rows.filter((r) => r.rating_count >= 100).map((r) => `${SITE_URL}/perfumes/${r.id}`)
    const others = rows.filter((r) => r.rating_count < 100).map((r) => `${SITE_URL}/perfumes/${r.id}`)
    assert.ok(locs.includes(`${SITE_URL}/carte`))
    assert.ok(popular.every((url) => locs.includes(url)))
    assert.ok(others.every((url) => !locs.includes(url)))
    assert.ok(!locs.some((url) => url.includes('/compte')))
  })
})
