// Couleurs de la carte olfactive.
// Les 13 familles sont regroupées en 6 grandes familles : au-delà, les couleurs d'un nuage
// de points deviennent impossibles à distinguer (vérifié avec un outil de contrôle des
// palettes, daltonismes compris). La légende permet d'isoler une famille, la couleur
// ne porte donc jamais seule l'information.
export const MAP_GROUPS = [
  { key: 'citrus', label: 'Agrumes et frais', color: '#eda100', families: ['citrus', 'fresh'] },
  { key: 'green', label: 'Verts et aromatiques', color: '#1baf7a', families: ['green'] },
  { key: 'floral', label: 'Floraux', color: '#e87ba4', families: ['floral', 'white_floral'] },
  { key: 'gourmand', label: 'Fruités et gourmands', color: '#e34948', families: ['fruity', 'gourmand'] },
  { key: 'amber', label: 'Ambrés, épicés, musqués', color: '#6250d6', families: ['amber', 'spicy', 'musky'] },
  { key: 'woody', label: 'Boisés et cuirs', color: '#008300', families: ['woody', 'leather'] },
  { key: 'other', label: 'Autres', color: '#898781', families: [] },
]

const GROUP_OF_FAMILY = Object.fromEntries(
  MAP_GROUPS.flatMap((group) => group.families.map((family) => [family, group])),
)

// Grande famille d'une famille d'accord (null ou inconnue -> Autres)
export function mapGroupOf(family) {
  return GROUP_OF_FAMILY[family] ?? MAP_GROUPS.at(-1)
}
