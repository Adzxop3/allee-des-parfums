import { useState } from 'react'
import { apiSend } from '../api.js'

// Renvoi de l'email de confirmation.
// status : null | 'sending' | 'sent' ; error : message si l'envoi a échoué
export function useResendVerification() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  async function resend() {
    setStatus('sending')
    setError(null)
    try {
      await apiSend('POST', '/api/auth/resend-verification')
      setStatus('sent')
    } catch (err) {
      setStatus(null)
      setError(err.message)
    }
  }

  return { status, error, resend }
}
