import { expect, test } from '@playwright/test'

test('rechercher un parfum et ouvrir sa fiche', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('Nom de parfum ou de marque').fill('Velours')
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click()

  // Les 4 parfums « Velours … » du jeu fictif, et seulement eux
  const cards = page.getByRole('main').getByRole('link', { name: /^Velours/ })
  await expect(cards).toHaveCount(4)
  await expect(page.getByText('4 parfums')).toBeVisible()

  await cards.filter({ hasText: 'Velours Secrète' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Velours Secrète')
  await expect(page).toHaveURL(/\/perfumes\/900003$/)
  await expect(page).toHaveTitle('Velours Secrète (Azur Démo) · Allée des parfums')
})

test('rechercher par marque', async ({ page }) => {
  await page.goto('/?q=Maison%20Essai')
  await expect(page.getByText('10 parfums')).toBeVisible()
})
