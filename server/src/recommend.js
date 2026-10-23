import { z } from 'zod'
import { pool } from './db.js'
import { GROUP_FAMILIES } from './families.js'
import { COMBINED_RATING, COMMUNITY_JOIN } from './ratings.js'

// Moteur du questionnaire : chaque parfum candidat reçoit un score de 0 à 1
// (moyenne pondérée des questions répondues) et une explication courte.

const MIN_RATINGS = 100 // même seuil que les ambiances et la carte
const GROUPS = Object.keys(GROUP_FAMILIES)
const GROUP_OF_FAMILY = Object.fromEntries(
  Object.entries(GROUP_FAMILIES).flatMap(([group, families]) => families.map((family) => [family, group])),
)

// Poids de chaque question ; une question sans réponse (« peu importe ») est ignorée
// et son poids réparti entre les autres
const WEIGHTS = { families: 0.3, likedNotes: 0.25, season: 0.15, time: 0.1, intensity: 0.1, popularity: 0.1 }

// --- Réponses au questionnaire ---

const noteIds = z
  .array(z.number().int().positive(), { error: 'Notes invalides' })
  .max(5, { error: '5 notes au maximum' })
  .default([])

export const answersSchema = z.object({
  forWhom: z.enum(['female', 'male', 'any'], { error: 'Réponse invalide' }).default('any'),
  families: z
    .array(z.enum(GROUPS), { error: 'Familles invalides' })
    .max(3, { error: '3 familles au maximum' })
    .default([]),
  likedNotes: noteIds,
  dislikedNotes: noteIds,
  season: z.enum(['winter', 'spring', 'summer', 'autumn', 'any'], { error: 'Saison invalide' }).default('any'),
  time: z.enum(['day', 'night', 'any'], { error: 'Moment invalide' }).default('any'),
  intensity: z.enum(['light', 'moderate', 'strong', 'any'], { error: 'Intensité invalide' }).default('any'),
  popularity: z.enum(['classic', 'discovery', 'any'], { error: 'Réponse invalide' }).default('any'),
  excludeOwned: z.boolean().default(false),
})

// --- Données des parfums candidats, chargées une fois puis gardées en mémoire ---

let candidatesPromise = null
export function loadCandidates() {
  candidatesPromise ??= fetchCandidates().catch((err) => {
    candidatesPromise = null // une erreur ne reste pas en cache
    throw err
  })
  return candidatesPromise
}

async function fetchCandidates() {
  const filter = 'JOIN perfumes p ON p.id = x.perfume_id AND p.rating_count >= $1'
  const [perfumes, accords, notes, moods] = await Promise.all([
    pool.query(
      `SELECT p.id, p.name, b.name AS brand, p.gender, p.rating_count, p.longevity, p.sillage,
              ${COMBINED_RATING} AS rating
       FROM perfumes p LEFT JOIN brands b ON b.id = p.brand_id
       ${COMMUNITY_JOIN}
       WHERE p.rating_count >= $1`,
      [MIN_RATINGS],
    ),
    pool.query(
      `SELECT x.perfume_id, a.family, x.intensity
       FROM perfume_accords x JOIN accords a ON a.id = x.accord_id ${filter}`,
      [MIN_RATINGS],
    ),
    pool.query(
      `SELECT x.perfume_id, x.note_id, max(x.weight) AS weight
       FROM perfume_notes x ${filter} GROUP BY x.perfume_id, x.note_id`,
      [MIN_RATINGS],
    ),
    pool.query(
      `SELECT x.perfume_id, m.name, x.score
       FROM perfume_moods x JOIN moods m ON m.id = x.mood_id ${filter}
       WHERE m.type IN ('season', 'occasion')`,
      [MIN_RATINGS],
    ),
  ])

  const byId = new Map(
    perfumes.rows.map((p) => [p.id, { ...p, groups: {}, notes: new Map(), votes: {}, mainGroup: null, mainIntensity: 0 }]),
  )

  // Part de chaque grande famille dans l'intensité totale des accords, et famille de l'accord principal
  const totals = new Map()
  for (const { perfume_id: id, family, intensity } of accords.rows) {
    const c = byId.get(id)
    const group = GROUP_OF_FAMILY[family]
    totals.set(id, (totals.get(id) ?? 0) + intensity)
    if (group) c.groups[group] = (c.groups[group] ?? 0) + intensity
    if (intensity > c.mainIntensity) {
      c.mainIntensity = intensity
      c.mainGroup = group ?? null
    }
  }
  for (const [id, total] of totals) {
    const c = byId.get(id)
    for (const group of Object.keys(c.groups)) c.groups[group] /= total
  }

  for (const { perfume_id: id, note_id: noteId, weight } of notes.rows) byId.get(id).notes.set(noteId, weight ?? 0)
  for (const { perfume_id: id, name, score } of moods.rows) byId.get(id).votes[name] = score

  // Intensité : moyenne de la tenue (1 à 5) et du sillage (1 à 4) ramenés entre 0 et 1,
  // puis classée en 3 niveaux de même effectif (discret, modéré, puissant)
  const list = [...byId.values()]
  for (const c of list) {
    c.intensityValue = c.longevity && c.sillage ? ((c.longevity - 1) / 4 + (c.sillage - 1) / 3) / 2 : null
  }
  const sorted = list.map((c) => c.intensityValue).filter((v) => v !== null).sort((a, b) => a - b)
  const thresholds = [sorted[Math.floor(sorted.length / 3)], sorted[Math.floor((2 * sorted.length) / 3)]]

  // Popularité : nombre de votants sur une échelle logarithmique, de 0 (100 votants) à 1 (le plus voté)
  const maxLog = Math.log(Math.max(...list.map((c) => c.rating_count)))
  const minLog = Math.log(MIN_RATINGS)

  for (const c of list) {
    c.intensityLevel =
      c.intensityValue === null ? null : c.intensityValue < thresholds[0] ? 0 : c.intensityValue < thresholds[1] ? 1 : 2
    c.popularity = (Math.log(c.rating_count) - minLog) / (maxLog - minLog)
    // Note (Fragrantica + avis des membres) ramenée entre 0 (1/5) et 1 (5/5)
    c.quality = c.rating ? (c.rating - 1) / 4 : 0.5
  }

  // Pour illustrer la question des familles : parmi les parfums très connus, les deux où la famille pèse le plus
  const famous = list.filter((c) => c.rating_count >= 5000)
  const examples = Object.fromEntries(
    GROUPS.map((group) => [
      group,
      [...famous]
        .sort((a, b) => (b.groups[group] ?? 0) - (a.groups[group] ?? 0))
        .slice(0, 2)
        .map((c) => `${c.name} (${c.brand})`),
    ]),
  )

  return { list, examples }
}

// --- Score ---

const INTENSITY_LEVELS = { light: 0, moderate: 1, strong: 2 }

// Renvoie null si le parfum est écarté, sinon { score, rank, parts } :
// score = correspondance de 0 à 1 (null sans aucune préférence), rank = valeur de tri,
// parts = valeur de 0 à 1 pour chaque question répondue
function scorePerfume(c, answers) {
  if (answers.forWhom === 'female' && c.gender === 'male') return null
  if (answers.forWhom === 'male' && c.gender === 'female') return null

  // Notes à éviter : dominante (poids ≥ 50) → écarté ; discrète → score réduit de 25 %
  let penalty = 1
  for (const noteId of answers.dislikedNotes) {
    const weight = c.notes.get(noteId)
    if (weight === undefined) continue
    if (weight >= 50) return null
    penalty *= 0.75
  }

  const parts = {}
  // Familles : 60 % de l'intensité des accords ou plus = 1 (la famille domine le parfum).
  // Sans ce plafond, les parfums faits d'une seule famille (souvent très atypiques) passeraient devant.
  if (answers.families.length) {
    const share = answers.families.reduce((sum, group) => sum + (c.groups[group] ?? 0), 0)
    parts.families = Math.min(1, share / 0.6)
  }
  if (answers.likedNotes.length) {
    const found = answers.likedNotes.filter((id) => c.notes.has(id))
    parts.likedNotes = found.reduce((sum, id) => sum + 0.5 + (0.5 * c.notes.get(id)) / 100, 0) / answers.likedNotes.length
  }
  // Saison : 50 % des votes ou plus = 1 (une saison sur quatre fait 25 % en moyenne)
  if (answers.season !== 'any') parts.season = Math.min(1, (c.votes[answers.season] ?? 0) / 0.5)
  // Jour / soir : 75 % des votes ou plus = 1 (50 % en moyenne)
  if (answers.time !== 'any') parts.time = Math.min(1, (c.votes[answers.time] ?? 0) / 0.75)
  if (answers.intensity !== 'any') {
    const gap = c.intensityLevel === null ? 1 : Math.abs(c.intensityLevel - INTENSITY_LEVELS[answers.intensity])
    parts.intensity = [1, 0.5, 0][gap]
  }
  if (answers.popularity === 'classic') parts.popularity = c.popularity
  if (answers.popularity === 'discovery') parts.popularity = 1 - c.popularity

  const keys = Object.keys(parts)
  // Aucune préférence exprimée : les parfums les plus populaires d'abord (sans pourcentage de correspondance)
  if (!keys.length) return { score: null, rank: (c.popularity * 0.9 + c.quality * 0.1) * penalty, parts }
  const totalWeight = keys.reduce((sum, key) => sum + WEIGHTS[key], 0)
  const score = (keys.reduce((sum, key) => sum + WEIGHTS[key] * parts[key], 0) / totalWeight) * penalty
  // Avec peu de réponses, beaucoup de parfums atteignent le même score : la note de la communauté
  // (5 %) et, sans préférence à la question 8, la popularité (5 %) départagent le classement.
  // Le score affiché (correspondance) ne change pas.
  const rank =
    answers.popularity === 'any'
      ? score * 0.9 + c.popularity * 0.05 + c.quality * 0.05
      : score * 0.95 + c.quality * 0.05
  return { score, rank, parts }
}

// --- Explication ---

const GROUP_REASONS = {
  citrus: 'sa fraîcheur hespéridée',
  green: 'son côté vert et aromatique',
  floral: 'son cœur floral',
  gourmand: 'son côté fruité et gourmand',
  amber: 'sa chaleur ambrée et épicée',
  woody: 'sa dominante boisée',
}
const SEASON_WORDS = { winter: 'en hiver', spring: 'au printemps', summer: 'en été', autumn: 'en automne' }
const INTENSITY_WORDS = ['discrète', 'modérée', 'puissante'] // « d'intensité … »

const joinWithAnd = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} et ${items.at(-1)}` : items[0])
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

// Les 3 questions qui ont le plus contribué au score (et bien satisfaites) deviennent l'explication
function explain(c, answers, parts, noteNames) {
  const top = Object.keys(parts)
    .filter((key) => parts[key] >= 0.5)
    .sort((a, b) => WEIGHTS[b] * parts[b] - WEIGHTS[a] * parts[a])
    .slice(0, 3)

  const reasons = [] // « Pour … »
  const uses = [] // « Très porté en hiver, plutôt le soir »
  for (const key of top) {
    if (key === 'families') {
      const best = [...answers.families].sort((a, b) => (c.groups[b] ?? 0) - (c.groups[a] ?? 0))[0]
      reasons.push(GROUP_REASONS[best])
    }
    if (key === 'likedNotes') {
      const names = answers.likedNotes
        .filter((id) => c.notes.has(id))
        .sort((a, b) => c.notes.get(b) - c.notes.get(a))
        .slice(0, 3)
        .map((id) => noteNames.get(id))
      reasons.push(names.length > 1 ? `ses notes de ${joinWithAnd(names)}` : `sa note de ${names[0]}`)
    }
    if (key === 'popularity') {
      reasons.push(answers.popularity === 'classic' ? 'son statut de grand classique' : 'son côté confidentiel')
    }
    if (key === 'season') uses.push(`très porté ${SEASON_WORDS[answers.season]}`)
    if (key === 'time') uses.push(answers.time === 'day' ? 'plutôt porté en journée' : 'plutôt porté le soir')
    if (key === 'intensity') uses.push(`d'intensité ${INTENSITY_WORDS[c.intensityLevel]}`)
  }

  const sentences = []
  if (reasons.length) sentences.push(`Pour ${joinWithAnd(reasons)}.`)
  if (uses.length) sentences.push(`${capitalize(joinWithAnd(uses))}.`)
  return sentences.join(' ') || 'Parmi les parfums les plus appréciés.'
}

// --- Point d'entrée ---

// Les `limit` meilleurs parfums : [{ id, score, explanation }]
export async function recommend(answers, { excludedIds = new Set(), limit = 20 } = {}) {
  const { list } = await loadCandidates()

  const scored = []
  for (const c of list) {
    if (excludedIds.has(c.id)) continue
    const result = scorePerfume(c, answers)
    if (result) scored.push({ c, ...result })
  }
  scored.sort((a, b) => b.rank - a.rank || b.c.rating_count - a.c.rating_count)
  const best = scored.slice(0, limit)

  const { rows } = await pool.query('SELECT id, name FROM notes WHERE id = ANY($1)', [answers.likedNotes])
  const noteNames = new Map(rows.map((r) => [r.id, r.name]))

  return best.map(({ c, score, parts }) => ({ id: c.id, score, explanation: explain(c, answers, parts, noteNames) }))
}
