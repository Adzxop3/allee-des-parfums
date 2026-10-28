import { GROUP_FAMILIES } from '../../shared/familyGroups.js'

// Couleurs de la carte olfactive.
// Les 13 familles sont regroupées en 6 grandes familles : au-delà, les couleurs d'un nuage
// de points deviennent impossibles à distinguer (vérifié avec un outil de contrôle des
// palettes, daltonismes compris). La légende permet d'isoler une famille, la couleur
// ne porte donc jamais seule l'information.
// Les couleurs sont des variables CSS (index.css) : étapes claires ou sombres selon le thème.
export const MAP_GROUPS = [
  { key: 'citrus', label: 'Agrumes et frais', color: 'var(--map-citrus)', families: GROUP_FAMILIES.citrus },
  { key: 'green', label: 'Verts et aromatiques', color: 'var(--map-green)', families: GROUP_FAMILIES.green },
  { key: 'floral', label: 'Floraux', color: 'var(--map-floral)', families: GROUP_FAMILIES.floral },
  { key: 'gourmand', label: 'Fruités et gourmands', color: 'var(--map-gourmand)', families: GROUP_FAMILIES.gourmand },
  { key: 'amber', label: 'Ambrés, épicés, musqués', color: 'var(--map-amber)', families: GROUP_FAMILIES.amber },
  { key: 'woody', label: 'Boisés et cuirs', color: 'var(--map-woody)', families: GROUP_FAMILIES.woody },
  { key: 'other', label: 'Autres', color: 'var(--map-other)', families: [] },
]

const GROUP_OF_FAMILY = Object.fromEntries(
  MAP_GROUPS.flatMap((group) => group.families.map((family) => [family, group])),
)

// Grande famille d'une famille d'accord (null ou inconnue -> Autres)
export function mapGroupOf(family) {
  return GROUP_OF_FAMILY[family] ?? MAP_GROUPS.at(-1)
}
