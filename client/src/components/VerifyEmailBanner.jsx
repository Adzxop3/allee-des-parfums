import { useAuth } from '../auth/AuthContext.js'
import { useResendVerification } from '../auth/useResendVerification.js'

// Bandeau affiché tant que l'utilisateur connecté n'a pas confirmé son adresse email
export default function VerifyEmailBanner() {
  const { user } = useAuth()
  const { status, error, resend } = useResendVerification()

  if (!user || user.emailVerified) return null

  return (
    <div className="border-b border-notice-line bg-notice-bg">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm text-notice">
        <span>
          Confirmez votre adresse email : un lien a été envoyé à <strong>{user.email}</strong>.
        </span>
        {status === 'sent' ? (
          <span role="status">Nouvel email envoyé.</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={status === 'sending'}
            className="link disabled:opacity-60"
          >
            {status === 'sending' ? 'Envoi…' : "Renvoyer l'email"}
          </button>
        )}
        {error && (
          <span role="alert" className="text-danger">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
