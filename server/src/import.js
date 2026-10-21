import { createReadStream } from 'node:fs'
import { pool } from './db.js'

// Usage : npm run import [chemin/vers/perfumes.jsonl]
const file = process.argv[2] ?? new URL('../../data/perfumes.jsonl', import.meta.url)

const POSITIONS = { top: 'top', middle: 'heart', base: 'base' }

// Retire les espaces superflus ; une chaîne vide devient null
function clean(value) {
  if (typeof value !== 'string') return null
  const s = value.replace(/\s+/g, ' ').trim()
  return s || null
}

// Regroupe les variantes de casse d'un même nom ("Guess" / "guess")
// et retient l'orthographe la plus fréquente
function createDictionary() {
  const variants = new Map() // nom en minuscules -> { orthographe: occurrences }
  return {
    add(name) {
      const key = name.toLowerCase()
      const counts = variants.get(key) ?? {}
      counts[name] = (counts[name] ?? 0) + 1
      variants.set(key, counts)
      return key
    },
    names() {
      return [...variants.values()].map(
        (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0],
      )
    },
  }
}

// Répartition des votes en parts (0 à 1) ; rien si aucun vote
function shares(type, votes) {
  const total = Object.values(votes ?? {}).reduce((sum, n) => sum + n, 0)
  if (!total) return []
  return Object.entries(votes).map(([name, n]) => [type, name, n / total])
}

// Lit le fichier ligne par ligne en coupant uniquement sur "\n"
// (readline couperait aussi sur les séparateurs Unicode présents dans les descriptions)
async function* readLines(path) {
  let rest = ''
  for await (const chunk of createReadStream(path, 'utf8')) {
    const parts = (rest + chunk).split('\n')
    rest = parts.pop()
    yield* parts
  }
  if (rest) yield rest
}

// 1. Lecture et nettoyage du fichier

const brands = createDictionary()
const perfumers = createDictionary()
const notes = createDictionary()
const accords = createDictionary()
const perfumes = []

for await (const line of readLines(file)) {
  if (!line.trim()) continue
  const d = JSON.parse(line)
  const name = clean(d.name)
  if (!name) continue

  const brand = clean(d.brand)
  const perfume = {
    id: d.id,
    name,
    brandKey: brand && brands.add(brand),
    year: Number.isInteger(d.year) && d.year >= 1700 ? d.year : null,
    gender: clean(d.gender),
    description: clean(d.description),
    imageUrl: clean(d.picture),
    perfumerKeys: new Set(),
    notes: new Map(), // "position|note" -> [position, note]
    accords: new Map(), // accord -> intensité
    moods: [...shares('season', d.seasons), ...shares('occasion', d.daypart)],
  }

  for (const p of d.perfumers ?? []) {
    const n = clean(p.name)
    if (n) perfume.perfumerKeys.add(perfumers.add(n))
  }

  const tiered = d.notes?.tiered ?? {}
  const noteLists = [
    ...Object.entries(POSITIONS).map(([field, position]) => [position, tiered[field]]),
    ['flat', d.notes?.flat],
  ]
  for (const [position, list] of noteLists) {
    for (const note of list ?? []) {
      const n = clean(note.name)
      if (!n) continue
      const key = notes.add(n)
      perfume.notes.set(`${position}|${key}`, [position, key])
    }
  }

  for (const a of d.accords ?? []) {
    const n = clean(a.name)
    if (n) perfume.accords.set(accords.add(n), a.strength ?? null)
  }

  perfumes.push(perfume)
}

console.log(`${perfumes.length} parfums lus`)

// 2. Écriture en base, dans une seule transaction

const client = await pool.connect()

// Insère des lignes par paquets ; la requête reçoit une liste de valeurs par colonne
async function insertRows(sql, rows, size = 5000) {
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size)
    const columns = batch[0].map((_, c) => batch.map((row) => row[c]))
    await client.query(sql, columns)
  }
}

// Ajoute les noms manquants et renvoie la correspondance nom en minuscules -> id
async function upsertNames(table, names) {
  await client.query(
    `INSERT INTO ${table} (name) SELECT unnest($1::text[]) ON CONFLICT (name) DO NOTHING`,
    [names],
  )
  const { rows } = await client.query(`SELECT id, name FROM ${table}`)
  return new Map(rows.map((r) => [r.name.toLowerCase(), r.id]))
}

try {
  await client.query('BEGIN')

  const brandIds = await upsertNames('brands', brands.names())
  const perfumerIds = await upsertNames('perfumers', perfumers.names())
  const noteIds = await upsertNames('notes', notes.names())
  const accordIds = await upsertNames('accords', accords.names())

  const moodList = [
    ...['winter', 'spring', 'summer', 'autumn'].map((name) => ['season', name]),
    ...['day', 'night'].map((name) => ['occasion', name]),
  ]
  await insertRows(
    `INSERT INTO moods (type, name) SELECT * FROM unnest($1::text[], $2::text[])
     ON CONFLICT (type, name) DO NOTHING`,
    moodList,
  )
  const { rows: moodRows } = await client.query('SELECT id, type, name FROM moods')
  const moodIds = new Map(moodRows.map((r) => [`${r.type}|${r.name}`, r.id]))

  await insertRows(
    `INSERT INTO perfumes (id, name, brand_id, year, gender, description, image_url)
     SELECT * FROM unnest($1::int[], $2::text[], $3::int[], $4::smallint[], $5::text[], $6::text[], $7::text[])
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, brand_id = EXCLUDED.brand_id, year = EXCLUDED.year,
       gender = EXCLUDED.gender, description = EXCLUDED.description, image_url = EXCLUDED.image_url`,
    perfumes.map((p) => [
      p.id, p.name, brandIds.get(p.brandKey) ?? null, p.year, p.gender, p.description, p.imageUrl,
    ]),
  )

  await insertRows(
    `INSERT INTO perfume_perfumers (perfume_id, perfumer_id)
     SELECT * FROM unnest($1::int[], $2::int[]) ON CONFLICT DO NOTHING`,
    perfumes.flatMap((p) => [...p.perfumerKeys].map((key) => [p.id, perfumerIds.get(key)])),
  )

  await insertRows(
    `INSERT INTO perfume_notes (perfume_id, note_id, position)
     SELECT * FROM unnest($1::int[], $2::int[], $3::text[]) ON CONFLICT DO NOTHING`,
    perfumes.flatMap((p) =>
      [...p.notes.values()].map(([position, key]) => [p.id, noteIds.get(key), position]),
    ),
  )

  await insertRows(
    `INSERT INTO perfume_accords (perfume_id, accord_id, intensity)
     SELECT * FROM unnest($1::int[], $2::int[], $3::real[])
     ON CONFLICT (perfume_id, accord_id) DO UPDATE SET intensity = EXCLUDED.intensity`,
    perfumes.flatMap((p) =>
      [...p.accords].map(([key, intensity]) => [p.id, accordIds.get(key), intensity]),
    ),
  )

  await insertRows(
    `INSERT INTO perfume_moods (perfume_id, mood_id, score)
     SELECT * FROM unnest($1::int[], $2::int[], $3::real[])
     ON CONFLICT (perfume_id, mood_id) DO UPDATE SET score = EXCLUDED.score`,
    perfumes.flatMap((p) =>
      p.moods.map(([type, name, score]) => [p.id, moodIds.get(`${type}|${name}`), score]),
    ),
  )

  await client.query('COMMIT')
} catch (err) {
  await client.query('ROLLBACK')
  throw err
} finally {
  client.release()
}

// Met à jour les statistiques de PostgreSQL après un gros import
// (sans cela, les requêtes de l'API n'utilisent pas toujours les bons index)
await pool.query('VACUUM ANALYZE')

// 3. Comptages par table

const tables = [
  'brands', 'perfumers', 'perfumes', 'perfume_perfumers', 'notes',
  'perfume_notes', 'accords', 'perfume_accords', 'moods', 'perfume_moods',
]
for (const table of tables) {
  const { rows } = await pool.query(`SELECT count(*) FROM ${table}`)
  console.log(`${table.padEnd(18)} ${rows[0].count}`)
}

await pool.end()
