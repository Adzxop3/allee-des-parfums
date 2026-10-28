// Environnement des tests, à importer en premier.
// Les tests utilisent toujours une base dédiée (parfums_test par défaut), vidée à chaque lancement :
// jamais la base locale du site ni la production.
import { fileURLToPath } from 'node:url'

try {
  // Identifiants PostgreSQL locaux (PGHOST, PGUSER, PGPASSWORD...) ; en CI, ils viennent de l'environnement
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)))
} catch {
  // pas de fichier .env
}

delete process.env.DATABASE_URL // jamais de base distante
delete process.env.SMTP_HOST // jamais de vrai email : ils restent en mémoire (mailer.js)
process.env.PGDATABASE = process.env.TEST_PGDATABASE || 'parfums_test'
if (!process.env.PGDATABASE.endsWith('_test')) {
  throw new Error(`Base de test refusée : « ${process.env.PGDATABASE} » (le nom doit finir par _test)`)
}
process.env.NODE_ENV ||= 'test'
// Chaque client de test simule sa propre adresse IP (en-tête X-Forwarded-For) : les limites
// anti-abus restent actives, sans que tous les tests partagent les mêmes compteurs
process.env.TRUST_PROXY = '1'
