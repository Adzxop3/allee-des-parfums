import { defineConfig } from '@playwright/test'

// Tests de bout en bout : le site compilé (client/dist) servi par l'API en mode production,
// sur la base de test (parfums_test, recréée au démarrage). Lancer avec : npm run test:e2e
const PORT = 3100

export default defineConfig({
  testDir: 'e2e',
  workers: 1, // une seule base partagée : les tests passent l'un après l'autre
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome', // le Chrome installé (aussi présent sur les machines GitHub Actions)
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node e2e/server.js',
    url: `http://localhost:${PORT}/api/health`,
    env: { PORT: String(PORT) },
    timeout: 120_000,
    reuseExistingServer: false,
  },
})
