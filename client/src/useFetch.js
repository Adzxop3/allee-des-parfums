import { useEffect, useState } from 'react'
import { signalUnauthorized } from './api.js'

// Message lisible selon le code HTTP, quand l'API ne fournit pas le sien
function messageForStatus(status) {
  if (status === 404) return 'Introuvable.'
  if (status >= 500) return 'Le serveur a rencontré un problème.'
  return `Erreur ${status}.`
}

// Charge du JSON depuis l'API ; renvoie { data, error, loading, reload }.
// Pendant un nouveau chargement, data garde la réponse précédente.
export function useFetch(url) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ url: null, attempt: 0, data: null, error: null })

  useEffect(() => {
    const controller = new AbortController()

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (res.status === 401) signalUnauthorized()
        if (!res.ok) throw new Error(body?.error ?? messageForStatus(res.status))
        setResult({ url, attempt, data: body, error: null })
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        // fetch échoue avec un TypeError quand le serveur est injoignable
        const message = err instanceof TypeError ? 'Impossible de joindre le serveur.' : err.message
        setResult({ url, attempt, data: null, error: message })
      })

    return () => controller.abort()
  }, [url, attempt])

  // Tant que la réponse reçue ne correspond pas à la demande en cours, on charge
  const loading = result.url !== url || result.attempt !== attempt
  return {
    data: result.data,
    error: loading ? null : result.error,
    loading,
    reload: () => setAttempt((n) => n + 1),
  }
}
