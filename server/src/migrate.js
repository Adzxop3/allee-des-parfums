import { readdir, readFile } from 'node:fs/promises'
import { pool } from './db.js'

// Exécute tous les fichiers .sql de /migrations dans l'ordre alphabétique
const dir = new URL('../migrations/', import.meta.url)
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()

for (const file of files) {
  const sql = await readFile(new URL(file, dir), 'utf8')
  await pool.query(sql)
  console.log(`Migration appliquée : ${file}`)
}

await pool.end()
