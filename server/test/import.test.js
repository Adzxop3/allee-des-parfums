// Import du dataset (src/import.js), sur les 40 parfums fictifs de test/fixtures
import { after, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './helpers.js'

after(() => pool.end())

const serverDir = fileURLToPath(new URL('..', import.meta.url))
const fixture = fileURLToPath(new URL('./fixtures/perfumes.jsonl', import.meta.url))

function runImport(file) {
  const result = spawnSync(process.execPath, ['src/import.js', file], { cwd: serverDir, env: process.env, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
}

async function count(table) {
  const { rows } = await pool.query(`SELECT count(*)::int AS n FROM ${table}`)
  return rows[0].n
}

describe('import', () => {
  test('importe les parfums, marques, parfumeurs, notes et accords', async () => {
    assert.equal(await count('perfumes'), 40)
    assert.equal(await count('brands'), 4)
    assert.equal(await count('perfumers'), 3)
    assert.ok((await count('perfume_notes')) >= 40 * 7)
    assert.ok((await count('perfume_accords')) === 40 * 5)
  })

  test('nettoie les données', async () => {
    // Étages des notes renommés (middle -> heart), pas de note moyenne sans votants
    const { rows: positions } = await pool.query('SELECT DISTINCT position FROM perfume_notes ORDER BY position')
    assert.deepEqual(positions.map((r) => r.position), ['base', 'heart', 'top'])
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM perfumes WHERE rating_count = 0 AND rating_avg IS NOT NULL')
    assert.equal(rows[0].n, 0)
  })

  test('calcule les données dérivées des notes', async () => {
    // Nombre de parfums par note
    const { rows: musk } = await pool.query(
      `SELECT n.perfume_count, (SELECT count(DISTINCT perfume_id) FROM perfume_notes WHERE note_id = n.id)::int AS real
       FROM notes n WHERE n.name = 'Musk'`,
    )
    assert.equal(musk[0].perfume_count, musk[0].real)

    // Famille déduite pour les notes assez courantes, corrections manuelles appliquées (families.js)
    const { rows: families } = await pool.query("SELECT name, family FROM notes WHERE name IN ('Sandalwood', 'Bergamot')")
    assert.equal(families.find((r) => r.name === 'Sandalwood').family, 'woody')
    assert.ok(families.find((r) => r.name === 'Bergamot').family)

    // Notes associées : 12 au plus par note, classées, jamais la note elle-même
    const { rows: associations } = await pool.query(
      `SELECT max(c)::int AS max_per_note, bool_or(self) AS self FROM (
         SELECT note_id, count(*) AS c, bool_or(note_id = associated_id) AS self FROM note_associations GROUP BY note_id
       ) t`,
    )
    assert.ok(associations[0].max_per_note > 0 && associations[0].max_per_note <= 12)
    assert.equal(associations[0].self, false)
  })

  test('calcule les ambiances (saisons, moments, humeurs)', async () => {
    const { rows } = await pool.query('SELECT DISTINCT m.type FROM perfume_moods pm JOIN moods m ON m.id = pm.mood_id ORDER BY 1')
    assert.deepEqual(rows.map((r) => r.type), ['mood', 'occasion', 'season'])
  })

  test('relancé, il met à jour sans doublon et garde les avis des membres', async () => {
    // Un avis existant sur un parfum du jeu
    const { rows: users } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name) VALUES ($1, 'x', 'Import') RETURNING id`,
      [`import-${Date.now()}@example.com`],
    )
    await pool.query(
      `INSERT INTO reviews (user_id, perfume_id, rating, title, body) VALUES ($1, 900040, 4, 'Avis', 'Un avis qui doit survivre à un nouvel import.')`,
      [users[0].id],
    )
    const before = { perfumes: await count('perfumes'), notes: await count('perfume_notes'), moods: await count('perfume_moods') }

    // Même fichier, avec un nom de parfum corrigé
    const dir = mkdtempSync(join(tmpdir(), 'import-test-'))
    const file = join(dir, 'perfumes.jsonl')
    writeFileSync(file, readFileSync(fixture, 'utf8').replace('"name":"Rose Secrète"', '"name":"Rose Secrète (corrigé)"'))
    try {
      runImport(file)
    } finally {
      rmSync(dir, { recursive: true })
    }

    const afterImport = { perfumes: await count('perfumes'), notes: await count('perfume_notes'), moods: await count('perfume_moods') }
    assert.deepEqual(afterImport, before)
    const { rows } = await pool.query('SELECT name FROM perfumes WHERE id = 900001')
    assert.equal(rows[0].name, 'Rose Secrète (corrigé)')
    const { rows: reviews } = await pool.query('SELECT count(*)::int AS n FROM reviews WHERE perfume_id = 900040')
    assert.equal(reviews[0].n, 1)

    runImport(fixture) // remet le jeu de test d'origine
  })
})
