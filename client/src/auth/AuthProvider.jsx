import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiSend } from '../api.js'
import { clearRecentPerfumes } from '../history.js'
import { AuthContext } from './AuthContext.js'

// Utilisateur connecté, partagé par toute l'application.
// user : undefined pendant la vérification au chargement, null si personne n'est connecté.
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)

  // Relit l'utilisateur connecté (au chargement, et après une vérification d'email ou un changement de mot de passe)
  const refresh = useCallback(
    () =>
      fetch('/api/auth/me')
        .then((res) => (res.ok ? res.json() : { user: null }))
        .then((data) => setUser(data.user))
        .catch(() => setUser(null)),
    [],
  )

  useEffect(() => {
    refresh()
    // Une réponse 401 de l'API (session expirée) : on revérifie l'utilisateur connecté
    window.addEventListener('auth:unauthorized', refresh)
    return () => window.removeEventListener('auth:unauthorized', refresh)
  }, [refresh])

  const value = useMemo(
    () => ({
      user: user ?? null,
      checking: user === undefined,
      refresh,
      async login(email, password) {
        const data = await apiSend('POST', '/api/auth/login', { email, password })
        setUser(data.user)
      },
      async register(fields) {
        const data = await apiSend('POST', '/api/auth/register', fields)
        setUser(data.user)
      },
      async logout() {
        await apiSend('POST', '/api/auth/logout')
        setUser(null)
      },
      async updateSettings(settings) {
        const data = await apiSend('PATCH', '/api/auth/settings', settings)
        setUser(data.user)
      },
      // Supprime le compte et toutes ses données ; l'historique local de « Surprends-moi » est aussi effacé
      async deleteAccount(password) {
        await apiSend('DELETE', '/api/auth/account', { password })
        clearRecentPerfumes()
        setUser(null)
      },
    }),
    [user, refresh],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
