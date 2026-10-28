import { expect, test } from '@playwright/test'
import { pool } from './helpers.js'

test("s'inscrire, puis être invité à confirmer son adresse", async ({ page }) => {
  const email = `inscription-e2e-${Date.now()}@example.com`
  await page.goto('/inscription')
  await page.getByLabel('Nom affiché').fill('Nouvelle inscrite')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill('motdepasse-e2e')
  await page.getByRole('button', { name: 'Créer mon compte' }).click()

  // Connectée tout de suite, avec le bandeau de confirmation de l'adresse
  await expect(page.getByText(`un lien a été envoyé à ${email}`)).toBeVisible()
  await expect(page).not.toHaveURL(/inscription/)

  const { rows } = await pool.query('SELECT display_name, email_verified_at FROM users WHERE email = $1', [email])
  expect(rows[0]).toEqual({ display_name: 'Nouvelle inscrite', email_verified_at: null })
})

test('les erreurs de saisie sont affichées à côté des champs', async ({ page }) => {
  await page.goto('/inscription')
  await page.getByLabel('Nom affiché').fill('Quelqu’un')
  await page.getByLabel('Email').fill('pas-une-adresse@')
  await page.getByLabel('Mot de passe').fill('court')
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.getByLabel('Mot de passe')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveURL(/inscription/)
})
