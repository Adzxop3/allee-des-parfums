// Lit ?page= et ?limit= (valeurs par défaut et bornes raisonnables)
export function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  return { page, limit, offset: (page - 1) * limit }
}

// Lit un identifiant numérique dans l'URL ; null s'il est invalide
export function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}
