import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext.js'
import { useResendVerification } from '../auth/useResendVerification.js'
import { buttonClass } from '../ui/styles.js'
import { Loading } from './Status.jsx'

// Affiche children seulement pour un utilisateur connecté dont l'email est confirmé.
// Sinon : invitation à se connecter, ou à confirmer son adresse (avec renvoi de l'email).
// feature : ce que débloque la confirmation, ex. « utiliser votre parfumothèque »
export default function RequireVerifiedEmail({ feature, children }) {
  const { user, checking } = useAuth()
  const location = useLocation()
  const { status, error, resend } = useResendVerification()

  if (checking) return <Loading />

  if (!user) {
    return (
      <div className="card p-4">
        <p>Connectez-vous pour {feature}.</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link
            to="/connexion"
            state={{ from: location.pathname + location.search }}
            className={buttonClass({ size: 'sm' })}
          >
            Se connecter
          </Link>
          <Link
            to="/inscription"
            state={{ from: location.pathname + location.search }}
            className={buttonClass({ variant: 'secondary', size: 'sm' })}
          >
            Créer un compte
          </Link>
        </div>
      </div>
    )
  }

  if (!user.emailVerified) {
    return (
      <div className="rounded-lg border border-notice-line bg-notice-bg p-4 text-notice">
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
              className={buttonClass({ variant: 'secondary', size: 'sm' })}
            >
              {status === 'sending' ? 'Envoi…' : "Renvoyer l'email"}
            </button>
          )}
          {error && (
            <p role="alert" className="mt-2 text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    )
  }

  return children
}
