import { expect, test } from '@playwright/test'
import { PERFUME } from './helpers.js'

// Ce que lisent les moteurs de recherche et les aperçus de liens : le HTML envoyé par le serveur,
// avant toute exécution de JavaScript
test('la fiche parfum arrive avec ses balises dans le HTML', async ({ request }) => {
  const res = await request.get(`/perfumes/${PERFUME.id}`)
  expect(res.status()).toBe(200)
  const html = await res.text()
  expect(html).toContain(`<title>${PERFUME.name} (Azur Démo) · Allée des parfums</title>`)
  expect(html).toMatch(/<meta name="description" content="Velours Secrète d&#39;Azur Démo/)
  expect(html).toContain(`<meta property="og:image" content="https://fimgs.net/mdimg/perfume/375x500.${PERFUME.id}.jpg" />`)
  expect(html).toMatch(new RegExp(`<link rel="canonical" href="[^"]+/perfumes/${PERFUME.id}" />`))
  const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">(.+?)<\/script>/)[1])
  expect(jsonLd).toMatchObject({ '@type': 'Product', name: PERFUME.name, brand: { name: 'Azur Démo' } })
})

test('une adresse inconnue renvoie 404, et la page « introuvable » s’affiche', async ({ page }) => {
  const res = await page.goto('/cette-page-n-existe-pas')
  expect(res.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page introuvable')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
})

test('robots.txt, sitemap.xml et image d’aperçu', async ({ request }) => {
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:')
  expect(await (await request.get('/sitemap.xml')).text()).toContain(`/perfumes/${PERFUME.id}</loc>`)
  const image = await request.get('/og-image.png')
  expect(image.headers()['content-type']).toBe('image/png')
})
