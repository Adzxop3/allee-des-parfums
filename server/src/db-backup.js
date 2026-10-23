import { mkdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { run, targetDatabase } from './pgTools.js'

// Sauvegarde de la base (locale, ou de production si DATABASE_URL est défini) dans data/backups/.
// Usage : npm run db:backup                    (tout)
//         npm run db:backup -- --catalog-only  (catalogue seulement, pour une première mise en ligne)
const catalogOnly = process.argv.includes('--catalog-only')

// Tables des membres : avec --catalog-only, leur structure est gardée mais pas leurs lignes
// (aucun compte, session, avis... de la base locale ne part en production)
const MEMBER_TABLES = [
  'users',
  'sessions',
  'auth_tokens',
  'collection_items',
  'user_preferences',
  'reviews',
  'review_votes',
  'comments',
  'reports',
  'moderation_log',
]

const dir = fileURLToPath(new URL('../../data/backups/', import.meta.url))
mkdirSync(dir, { recursive: true })
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
const file = `${dir}parfums-${catalogOnly ? 'catalogue-' : ''}${stamp}.dump`

console.log(
  `Sauvegarde ${catalogOnly ? 'du catalogue' : 'complète'} de ${
    process.env.DATABASE_URL ? 'la base DATABASE_URL' : `la base locale « ${process.env.PGDATABASE} »`
  }…`,
)
// Format personnalisé (-Fc) : compressé, restaurable avec pg_restore
run('pg_dump', [
  '--format=custom',
  '--no-owner',
  '--no-privileges',
  ...(catalogOnly ? MEMBER_TABLES.map((table) => `--exclude-table-data=${table}`) : []),
  `--file=${file}`,
  targetDatabase(),
])
console.log(`Sauvegarde créée : ${file} (${Math.round(statSync(file).size / 1024 / 1024)} Mo)`)
