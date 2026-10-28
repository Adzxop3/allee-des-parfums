// Génère perfumes.jsonl : 40 parfums fictifs au format du dataset, pour les tests.
// Données inventées (aucun extrait du dataset Fragrantica) et toujours identiques (hasard à graine fixe).
// Usage : node test/fixtures/make-fixture.js
import { writeFileSync } from 'node:fs'

// Générateur pseudo-aléatoire à graine fixe (mulberry32)
let seed = 42
function random() {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (list) => list[Math.floor(random() * list.length)]
const pickSome = (list, n) => [...list].sort(() => random() - 0.5).slice(0, n)
const int = (min, max) => min + Math.floor(random() * (max - min + 1))

const BRANDS = ['Maison Essai', 'Atelier Exemple', 'Parfums Fictifs', 'Azur Démo']
const WORDS = ['Rose', 'Ambre', 'Velours', 'Brume', 'Soleil', 'Nuit', 'Cèdre', 'Iris', 'Écume', 'Orage']
const SUFFIXES = ['Secrète', 'Blanche', 'Noire', 'd’Été', 'Absolue', 'Intense', 'Légère', 'du Soir']
const PERFUMERS = ['Camille Test', 'Jules Exemple', 'Inès Démo']
const TOP = ['Bergamot', 'Lemon', 'Pink Pepper', 'Mandarin Orange', 'Lavender']
const MIDDLE = ['Rose', 'Jasmine', 'Iris', 'Orange Blossom', 'Lavender']
const BASE = ['Vanilla', 'Musk', 'Amber', 'Sandalwood', 'Cedar', 'Patchouli', 'Tonka Bean', 'Vetiver', 'Leather']
const ACCORDS = ['citrus', 'floral', 'woody', 'sweet', 'vanilla', 'musky', 'fresh spicy', 'warm spicy', 'aromatic', 'powdery', 'amber', 'leather', 'fruity']
const histogram = (n) => [1, 2, 3, 4, 5].map((bucket) => ({ bucket, count: n }))

const lines = []
for (let i = 1; i <= 40; i++) {
  const id = 900000 + i
  const people = i <= 25 ? int(120, 5000) : int(0, 60) // 25 parfums assez votés pour les recommandations
  const name = `${WORDS[(i - 1) % WORDS.length]} ${SUFFIXES[Math.floor((i - 1) / WORDS.length) % SUFFIXES.length]}`
  const accords = pickSome(ACCORDS, 5).map((accord, rank) => ({ name: accord, strength: 100 - rank * 15 }))
  lines.push({
    id,
    name,
    brand: BRANDS[i % BRANDS.length],
    year: 1990 + (i % 35),
    gender: pick(['female', 'male', 'unisex']),
    description: `${name} est un parfum fictif créé pour les tests.`,
    picture: `https://fimgs.net/mdimg/perfume/375x500.${id}.jpg`,
    perfumers: [{ name: pick(PERFUMERS) }],
    accords,
    notes: {
      tiered: {
        top: pickSome(TOP, 2).map((note) => ({ name: note, weight: int(10, 100) })),
        middle: pickSome(MIDDLE, 2).map((note) => ({ name: note, weight: int(10, 100) })),
        base: pickSome(BASE, 3).map((note) => ({ name: note, weight: int(10, 100) })),
      },
      flat: [],
    },
    rating: { average: Math.round((2.5 + random() * 2.4) * 100) / 100 },
    people,
    longevity: { average: 3, histogram: histogram(people > 100 ? 10 : 1) },
    sillage: { average: 3, histogram: histogram(people > 100 ? 10 : 1) },
    seasons: { winter: int(0, 40), spring: int(0, 40), summer: int(0, 40), autumn: int(0, 40) },
    daypart: { day: int(0, 60), night: int(0, 60) },
  })
}

writeFileSync(new URL('./perfumes.jsonl', import.meta.url), lines.map((l) => JSON.stringify(l)).join('\n') + '\n')
console.log(`${lines.length} parfums fictifs écrits dans test/fixtures/perfumes.jsonl`)
