// Prépare la base de test : création si besoin, schéma vidé, migrations, import du jeu fictif.
// Lancé avant les tests (npm test) ; peut aussi être lancé seul : node test/setup-db.js
import './env.js'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const database = process.env.PGDATABASE
const serverDir = fileURLToPath(new URL('..', import.meta.url))

// 1. Création de la base (connexion à la base d'administration « postgres »)
const admin = new pg.Client({ database: 'postgres' })
await admin.connect()
const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])
if (!rowCount) await admin.query(`CREATE DATABASE "${database}"`)
await admin.end()

// 2. Schéma vide (les tests repartent toujours du même état)
const db = new pg.Client()
await db.connect()
await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public')
await db.end()

// 3. Migrations puis import des 40 parfums fictifs
function run(script, ...args) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: serverDir, env: process.env, encoding: 'utf8' })
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr)
    throw new Error(`Échec de ${script}`)
  }
}
run('src/migrate.js')
run('src/import.js', 'test/fixtures/perfumes.jsonl')
console.log(`Base de test « ${database} » prête (40 parfums fictifs).`)
