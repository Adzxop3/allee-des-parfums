import { useEffect, useState } from 'react'

// Charge du JSON depuis l'API ; renvoie { data, error, loading }.
// Pendant un nouveau chargement, data garde la réponse précédente.
export function useFetch(url) {
  const [result, setResult] = useState({ url: null, data: null, error: null })

  useEffect(() => {
    const controller = new AbortController()

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? `Erreur ${res.status}`)
        setResult({ url, data: body, error: null })
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setResult({ url, data: null, error: err.message })
      })

    return () => controller.abort()
  }, [url])

  // Tant que la réponse reçue ne correspond pas à l'URL demandée, on charge
  const loading = result.url !== url
  return { data: result.data, error: loading ? null : result.error, loading }
}
