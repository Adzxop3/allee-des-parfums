import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import { usePageTitle } from '../usePageTitle.js'

// Ouverte depuis le lien reçu par email : /verifier-email?token=...
export default function VerifyEmailPage() {
  usePageTitle("Confirmation de l'email")
  const [params] = useSearchParams()
  const token = params.get('token')
  const { refresh } = useAuth()
  const [state, setState] = useState(token ? 'pending' : 'error')
  const [error, setError] = useState(token ? null : 'Ce lien est incomplet.')
  // Le jeton ne sert qu'une fois : on n'envoie la demande qu'une seule fois,
  // même si React exécute l'effet deux fois en développement
  const sent = useRef(false)

  useEffect(() => {
    if (!token || sent.current) return
    sent.current = true
    apiSend('POST', '/api/auth/verify-email', { token })
      .then(() => {
        setState('done')
        refresh()
      })
      .catch((err) => {
        setState('error')
        setError(err.message)
      })
  }, [token, refresh])

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Confirmation de l'email</h1>
      <div className="mt-6">
        {state === 'pending' && <Loading label="Vérification en cours…" />}
        {state === 'done' && (
          <div role="status" className="card p-4">
            <p>Votre adresse email est confirmée. Merci !</p>
            <Link to="/" className="mt-3 inline-block link">
              Aller à l'accueil
            </Link>
          </div>
        )}
        {state === 'error' && (
          <>
            <ErrorMessage message={error} />
            <p className="mt-3 text-sm text-muted">
              Une fois connecté, vous pouvez demander un nouveau lien depuis le bandeau en haut de page.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
