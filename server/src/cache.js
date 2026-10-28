// Cache des réponses stables : le catalogue (parfums, notes, carte, statistiques) ne change
// qu'après un import.

// En mémoire, côté serveur : compute() n'est appelé qu'une fois par démarrage du serveur.
// Une erreur ne reste pas en cache (le calcul sera retenté à la prochaine demande).
const memory = new Map()
export function cached(key, compute) {
  if (!memory.has(key)) {
    memory.set(
      key,
      compute().catch((err) => {
        memory.delete(key)
        throw err
      }),
    )
  }
  return memory.get(key)
}

// Dans le navigateur : la réponse est réutilisée pendant `seconds` sans redemander au serveur.
// À réserver aux routes sans données personnelles ni avis des membres (qui changent souvent).
export function browserCache(seconds) {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${seconds}`)
    next()
  }
}

export const ONE_HOUR = 3600
