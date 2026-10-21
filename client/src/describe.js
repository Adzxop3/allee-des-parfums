import { ACCORDS } from './labels.js'

const SEASONS = { winter: 'en hiver', spring: 'au printemps', summer: 'en été', autumn: 'en automne' }
const DAYPARTS = { day: 'en journée', night: 'le soir' }

// "a", "a et b", "a, b et c"
function joinWithAnd(items) {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} et ${items.at(-1)}` : (items[0] ?? '')
}

// "de Chanel", mais "d'Azzaro"
function ofBrand(brand) {
  return /^[aeiouyàâéèêîôû]/i.test(brand) ? `d'${brand}` : `de ${brand}`
}

// Description en français construite à partir des données du parfum
// (le dataset ne fournit qu'une description en anglais)
export function describePerfume(perfume) {
  const sentences = []

  let intro = `${perfume.name} est un parfum${perfume.gender === 'unisex' ? ' mixte' : ''}`
  if (perfume.brand) intro += ` ${ofBrand(perfume.brand)}`
  if (perfume.gender === 'female') intro += ' pour femme'
  if (perfume.gender === 'male') intro += ' pour homme'
  if (perfume.year) intro += `, lancé en ${perfume.year}`
  sentences.push(`${intro}.`)

  if (perfume.perfumers.length) {
    sentences.push(`Il a été composé par ${joinWithAnd(perfume.perfumers.map((p) => p.name))}.`)
  }

  // Les accords arrivent triés par intensité décroissante
  const accords = perfume.accords.slice(0, 3).map((a) => ACCORDS[a.name] ?? a.name)
  if (accords.length) {
    const label = accords.length > 1 ? 'Ses accords dominants sont' : 'Son accord dominant est'
    sentences.push(`${label} ${joinWithAnd(accords)}.`)
  }

  // Les ambiances arrivent triées par score décroissant dans chaque type
  const season = perfume.moods.find((m) => m.type === 'season')
  const daypart = perfume.moods.find((m) => m.type === 'occasion')
  const moments = [SEASONS[season?.name], DAYPARTS[daypart?.name]].filter(Boolean)
  if (moments.length) sentences.push(`Il est surtout porté ${joinWithAnd(moments)}.`)

  return sentences.join(' ')
}
