import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import { Loading } from './Status.jsx'

// Affiche children seulement pour un utilisateur connecté dont l'email est confirmé.
// Sinon : invitation à se connecter, ou à confirmer son adresse (avec renvoi de l'email).
// feature : ce que débloque la confirmation, ex. « utiliser votre parfumothèque »
export default function RequireVerifiedEmail({ feature, children }) {
  const { user, checking } = useAuth()
  const location = useLocation()
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | message d'erreur

  if (checking) return <Loading />

  if (!user) {
    return (
      <div className="rounded border border-gray-200 bg-white p-4">
        <p>Connectez-vous pour {feature}.</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link
            to="/connexion"
            state={{ from: location.pathname + location.search }}
            className="rounded bg-gray-900 px-3 py-1.5 text-white"
          >
            Se connecter
          </Link>
          <Link
            to="/inscription"
            state={{ from: location.pathname + location.search }}
            className="rounded border border-gray-300 px-3 py-1.5"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    )
  }

  if (!user.emailVerified) {
    async function resend() {
      setStatus('sending')
      try {
        await apiSend('POST', '/api/auth/resend-verification')
        setStatus('sent')
      } catch (err) {
        setStatus(err.message)
      }
    }

    return (
      <div className="rounded border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <p>
          Confirmez votre adresse email pour {feature} : ouvrez le lien envoyé à <strong>{user.email}</strong>.
        </p>
        <div className="mt-3 text-sm">
          {status === 'sent' ? (
            <p role="status">Nouvel email envoyé.</p>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={status === 'sending'}
              className="rounded border border-amber-300 bg-white px-3 py-1.5 disabled:opacity-60"
            >
              {status === 'sending' ? 'Envoi…' : "Renvoyer l'email"}
            </button>
          )}
          {status && !['sending', 'sent'].includes(status) && (
            <p role="alert" className="mt-2 text-red-800">
              {status}
            </p>
          )}
        </div>
      </div>
    )
  }

  return children
}
