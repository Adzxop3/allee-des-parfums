import { expect, test } from '@playwright/test'

test('répondre au questionnaire et obtenir des suggestions', async ({ page }) => {
  await page.goto('/questionnaire')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pour qui cherchez-vous un parfum ?')
  await page.getByText('Pour femme', { exact: true }).click()
  await page.getByRole('button', { name: 'Suivant' }).click()

  // Familles : une famille, puis une note aimée
  await page.getByText('Floraux', { exact: true }).click()
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByLabel('Rechercher une note').fill('vani')
  await page.getByRole('button', { name: '+ Vanilla' }).click()
  await expect(page.getByRole('button', { name: 'Retirer Vanilla' })).toBeVisible()
  await page.getByRole('button', { name: 'Suivant' }).click()

  // Les questions suivantes peuvent être passées
  while (await page.getByRole('button', { name: /^(Passer|Suivant)$/ }).isVisible()) {
    await page.getByRole('button', { name: /^(Passer|Suivant)$/ }).click()
  }
  await page.getByRole('button', { name: 'Voir mes résultats' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vos parfums')
  const results = page.getByRole('main').getByRole('listitem').filter({ hasText: 'Correspondance' })
  await expect(results.first()).toBeVisible()
  expect(await results.count()).toBeGreaterThan(0)
})
