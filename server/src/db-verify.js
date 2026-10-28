import { readdir } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import pg from 'pg'
import { run } from './pgTools.js'

// Test de restauration d'une sauvegarde : elle est restaurée dans une base temporaire (sur le PostgreSQL
// local, ou celui de la CI), son contenu est vérifié, puis la base temporaire est supprimée.
// Ne touche ni à la base du site ni à la production.
// Usage : npm run db:verify -- data/backups/parfums-xxx.dump
const arg = process.argv[2]
if (!arg) {
  console.error('Indiquez le fichier à vérifier : npm run db:verify -- data/backups/parfums-xxx.dump')
  process.exit(1)
}
// npm --prefix change de dossier : le chemin est relatif au dossier où la commande a été tapée
const file = isAbsolute(arg) ? arg : resolve(process.env.INIT_CWD ?? process.cwd(), arg)
const temp = `parfums_verification_${Date.now()}`

// Contenu attendu : le catalogue complet, et toutes les migrations du code
const EXPECTED = { perfumes: 1, notes: 1, perfume_notes: 1, accords: 1, moods: 1 }
const MEMBER_TABLES = ['users', 'reviews', 'comments', 'collection_items']

// La base temporaire et sa suppression passent par une connexion à la base d'administration « postgres »
// (la base locale est désignée par les variables PG* ; DATABASE_URL, la production, n'est jamais utilisée)
delete process.env.DATABASE_URL
const admin = new pg.Client({ database: 'postgres' })
await admin.connect()
await admin.query(`CREATE DATABASE "${temp}"`)

let ok = true
const db = new pg.Client({ database: temp })
try {
  console.log(`Restauration de ${file} dans la base temporaire « ${temp} »…`)
  run('pg_restore', ['--no-owner', '--no-privileges', `--dbname=${temp}`, file])

  await db.connect()
  const count = async (table) => (await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n

  for (const [table, minimum] of Object.entries(EXPECTED)) {
    const n = await count(table)
    const good = n >= minimum
    ok &&= good
    console.log(`${good ? 'ok    ' : 'ÉCHEC '} ${table.padEnd(16)} ${n.toLocaleString('fr-FR')}`)
  }
  for (const table of MEMBER_TABLES) console.log(`       ${table.padEnd(16)} ${(await count(table)).toLocaleString('fr-FR')}`)

  // Migrations : une sauvegarde plus ancienne que le code en a moins (npm run migrate les appliquera)
  const files = (await readdir(new URL('../migrations/', import.meta.url))).filter((f) => f.endsWith('.sql'))
  const tracked = (await db.query("SELECT to_regclass('schema_migrations') AS t")).rows[0].t
  const names = tracked ? (await db.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name) : []
  const missing = files.filter((f) => !names.includes(f))
  if (!tracked) console.log('info   sauvegarde antérieure au suivi des migrations (npm run migrate les notera)')
  else if (missing.length) console.log(`info   migrations à appliquer après restauration : ${missing.join(', ')}`)
  else console.log(`ok     migrations : ${names.length}/${files.length}`)
} catch (err) {
  ok = false
  console.error(`ÉCHEC  ${err.message}`)
} finally {
  await db.end().catch(() => {})
  await admin.query(`DROP DATABASE IF EXISTS "${temp}" WITH (FORCE)`)
  await admin.end()
}

console.log(ok ? 'Sauvegarde restaurable : vérification réussie.' : 'Sauvegarde NON restaurable.')
process.exitCode = ok ? 0 : 1
