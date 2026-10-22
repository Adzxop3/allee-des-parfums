// Derniers parfums consultés, gardés dans le navigateur (pas de compte).
// Le stockage peut être indisponible (navigation privée...) : on ignore alors l'erreur.
const KEY = 'parfums:recent'
const MAX = 10

export function getRecentPerfumes() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(list) ? list.filter(Number.isInteger) : []
  } catch {
    return []
  }
}

export function addRecentPerfume(id) {
  try {
    const list = [id, ...getRecentPerfumes().filter((other) => other !== id)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // stockage indisponible : l'historique n'est simplement pas gardé
  }
}
