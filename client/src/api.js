// Erreur renvoyée par l'API : message général + messages par champ (formulaires)
export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

// Envoi vers l'API (POST, PATCH, DELETE...) avec un corps JSON.
// Le cookie de session part automatiquement : le site et l'API ont la même origine.
export async function apiSend(method, url, body) {
  let res
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Impossible de joindre le serveur.', 0)
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (res.status === 401) signalUnauthorized()
  if (!res.ok) throw new ApiError(data?.error ?? `Erreur ${res.status}.`, res.status, data?.fields)
  return data
}

// Une réponse 401 peut venir d'une session expirée (ou fermée depuis un autre onglet) :
// AuthProvider écoute cet évènement et revérifie qui est connecté, pour mettre l'interface à jour
export function signalUnauthorized() {
  window.dispatchEvent(new Event('auth:unauthorized'))
}
