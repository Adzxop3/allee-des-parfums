import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { pool } from './db.js'

// Applique, dans l'ordre alphabétique, les fichiers .sql de /migrations qui ne l'ont pas encore été.
// Chaque migration appliquée est notée dans schema_migrations : elle ne sera plus jamais rejouée.
// Règle : ne jamais modifier une migration déjà appliquée, en ajouter une nouvelle (014_..., 015_...).
// Une empreinte de chaque fichier est gardée : une migration modifiée après coup est signalée.
const dir = new URL('../migrations/', import.meta.url)
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
const sources = new Map(await Promise.all(files.map(async (file) => [file, await readFile(new URL(file, dir), 'utf8')])))
// Fins de ligne normalisées : le même fichier a la même empreinte sous Windows et sous Linux
const checksum = (sql) => createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex')

await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name       TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`)
await pool.query('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum TEXT')
const { rows } = await pool.query('SELECT name, checksum FROM schema_migrations')

// Migrations déjà appliquées : leur fichier ne doit pas avoir changé depuis
const changed = []
for (const { name, checksum: saved } of rows) {
  if (!sources.has(name)) continue
  const current = checksum(sources.get(name))
  if (saved === null) {
    // Appliquée avant l'ajout de ce contrôle : on enregistre son empreinte actuelle
    await pool.query('UPDATE schema_migrations SET checksum = $2 WHERE name = $1', [name, current])
  } else if (saved !== current) {
    changed.push(name)
  }
}

if (changed.length) {
  console.error(
    `Migration modifiée après avoir été appliquée : ${changed.join(', ')}.\n` +
      'Remettez le fichier tel quel et ajoutez plutôt une nouvelle migration.',
  )
  process.exitCode = 1
} else {
  const applied = new Set(rows.map((r) => r.name))
  const pending = files.filter((file) => !applied.has(file))
  if (!pending.length) console.log('Base à jour : aucune migration à appliquer.')

  for (const file of pending) {
    const sql = sources.get(file)
    const client = await pool.connect()
    try {
      // Tout ou rien : en cas d'erreur, la migration n'est ni appliquée ni notée
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [file, checksum(sql)])
      await client.query('COMMIT')
      console.log(`Migration appliquée : ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`Échec de la migration ${file} : ${err.message}`)
      process.exitCode = 1
      break
    } finally {
      client.release()
    }
  }
}

await pool.end()
