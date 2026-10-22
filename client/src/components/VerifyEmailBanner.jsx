import { useState } from 'react'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'

// Bandeau affiché tant que l'utilisateur connecté n'a pas confirmé son adresse email
export default function VerifyEmailBanner() {
  const { user } = useAuth()
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | message d'erreur

  if (!user || user.emailVerified) return null

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
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm text-amber-900">
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
            className="underline underline-offset-2 disabled:opacity-60"
          >
            {status === 'sending' ? 'Envoi…' : "Renvoyer l'email"}
          </button>
        )}
        {status && !['sending', 'sent'].includes(status) && (
          <span role="alert" className="text-red-800">
            {status}
          </span>
        )}
      </div>
    </div>
  )
}
