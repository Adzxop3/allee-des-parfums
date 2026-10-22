// Familles olfactives : chaque accord du dataset est rangé dans une famille.
// La famille d'une note est ensuite déduite de ces accords (voir import.js).
export const ACCORD_FAMILIES = {
  citrus: ['citrus'],
  fruity: ['fruity', 'cherry', 'Pear', 'tropical', 'sour'],
  floral: ['floral', 'rose', 'violet', 'iris', 'yellow floral'],
  white_floral: ['white floral', 'tuberose'],
  green: ['green', 'aromatic', 'herbal', 'lavender', 'conifer', 'terpenic', 'camphor', 'cannabis', 'bitter'],
  spicy: ['fresh spicy', 'warm spicy', 'soft spicy', 'cinnamon', 'anis', 'spice'],
  woody: ['woody', 'earthy', 'mossy', 'oud', 'patchouli', 'foresty'],
  amber: ['amber', 'balsamic'],
  gourmand: [
    'vanilla', 'sweet', 'caramel', 'chocolate', 'cacao', 'coffee', 'honey', 'almond', 'coconut',
    'nutty', 'gourmand', 'lactonic', 'milky', 'beeswax', 'rum', 'whiskey', 'Champagne', 'wine',
    'vodka', 'sake', 'alcohol', 'coca-cola',
  ],
  musky: ['musky', 'powdery', 'aldehydic', 'soapy'],
  fresh: ['fresh', 'aquatic', 'marine', 'ozonic', 'salty', 'mineral', 'sand', 'metallic'],
  leather: ['leather', 'smoky', 'tobacco', 'animalic'],
  other: [
    'bacon', 'bbq', 'meat', 'savory', 'gasoline', 'rubber', 'plastic', 'vinyl', 'asphault',
    'industrial glue', 'hot iron', 'varnish', 'wet plaster', 'paper', 'clay', 'tennis ball',
    'brown scotch tape', 'oily',
  ],
}

// Les 6 grandes familles de la carte olfactive (mêmes regroupements que client/src/mapGroups.js)
export const GROUP_FAMILIES = {
  citrus: ['citrus', 'fresh'],
  green: ['green'],
  floral: ['floral', 'white_floral'],
  gourmand: ['fruity', 'gourmand'],
  amber: ['amber', 'spicy', 'musky'],
  woody: ['woody', 'leather'],
}

// Corrections manuelles pour des notes courantes mal classées par la déduction automatique
export const NOTE_FAMILY_OVERRIDES = {
  Sandalwood: 'woody',
  'Cashmere Wood': 'woody',
  Citrus: 'citrus',
  Citruses: 'citrus',
  Petitgrain: 'citrus',
  Peony: 'floral',
  Geranium: 'floral',
  Heliotrope: 'floral',
  Cyclamen: 'floral',
  Lotus: 'floral',
  'Lily-of-the-Valley': 'white_floral',
  'Lily of the Valley': 'white_floral',
  Cassis: 'fruity',
  Melon: 'fruity',
  'Green Apple': 'fruity',
  'Violet Leaf': 'green',
  Basil: 'green',
  Saffron: 'spicy',
  Ambergris: 'amber',
  Incense: 'amber',
}
