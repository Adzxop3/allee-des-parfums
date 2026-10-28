import { expect, test } from '@playwright/test'
import { PERFUME, signIn } from './helpers.js'

test('publier un avis', async ({ page }) => {
  const { displayName } = await signIn(page)
  await page.goto(`/perfumes/${PERFUME.id}`)
  await page.getByRole('button', { name: 'Écrire un avis' }).click()

  await page.getByRole('group', { name: 'Ma note' }).locator('label').filter({ hasText: '4 étoiles' }).click()
  await expect(page.getByRole('radio', { name: '4 étoiles' })).toBeChecked()
  await page.getByLabel('Titre').fill('Un velours très doux')
  await page.getByLabel('Mon avis').fill('Tenue honnête, sillage discret : parfait pour le bureau en hiver.')
  await page.getByRole('button', { name: 'Publier mon avis' }).click()

  const reviews = page.locator('#avis')
  await expect(reviews.getByText('Un velours très doux')).toBeVisible()
  await expect(reviews.getByRole('link', { name: displayName })).toBeVisible()
  await expect(page.getByText('4 / 5 dans les avis des membres (1 avis)')).toBeVisible()
})
