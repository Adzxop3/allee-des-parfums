import { expect, test } from '@playwright/test'
import { PERFUME, signIn } from './helpers.js'

test('ajouter un parfum à sa parfumothèque', async ({ page }) => {
  await signIn(page)
  await page.goto(`/perfumes/${PERFUME.id}`)
  await page.getByRole('button', { name: "Je l'ai", exact: true }).click()
  await expect(page.getByRole('button', { name: "Je l'ai", exact: true })).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/parfumotheque')
  await expect(page.getByRole('tab', { name: 'Mes parfums (1)' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel').getByRole('link', { name: PERFUME.name }).first()).toBeVisible()
})

test('un visiteur est invité à se connecter', async ({ page }) => {
  await page.goto(`/perfumes/${PERFUME.id}`)
  await page.getByRole('button', { name: 'Ajouter à ma collection' }).click()
  await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible()
})
