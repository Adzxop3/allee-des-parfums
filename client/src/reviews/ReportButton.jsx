import { useId, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import { ErrorMessage } from '../components/Status.jsx'
import { REPORT_REASONS } from '../labels.js'

// « Signaler » un avis ou un commentaire : choix du motif, précision facultative.
// targetType : 'review' | 'comment'
export default function ReportButton({ targetType, targetId }) {
  const { user } = useAuth()
  const location = useLocation()
  const id = useId()
  const [step, setStep] = useState('closed') // 'closed' | 'form' | 'sent'
  const [reason, setReason] = useState(null)
  const [details, setDetails] = useState('')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!reason) {
      setError('Choisissez un motif.')
      return
    }
    setPending(true)
    setError(null)
    try {
      await apiSend('POST', '/api/reports', { targetType, targetId, reason, details })
      setStep('sent')
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  if (step === 'sent') {
    return (
      <p role="status" className="text-sm text-gray-700">
        Merci, votre signalement a été transmis à la modération.
      </p>
    )
  }

  if (step === 'closed') {
    return (
      <button type="button" onClick={() => setStep('form')} className="text-sm text-gray-600 underline underline-offset-2">
        Signaler
      </button>
    )
  }

  if (!user?.emailVerified) {
    return (
      <p className="text-sm text-gray-600">
        {user ? (
          'Confirmez votre adresse email pour signaler un contenu.'
        ) : (
          <>
            <Link to="/connexion" state={{ from: location.pathname }} className="underline underline-offset-2">
              Connectez-vous
            </Link>{' '}
            pour signaler un contenu.
          </>
        )}
      </p>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="mt-2 w-full space-y-3 rounded border border-gray-200 bg-gray-50 p-3 text-sm">
      <fieldset>
        <legend className="font-medium">Pourquoi signalez-vous ce contenu ?</legend>
        <div className="mt-2 space-y-1">
          {Object.entries(REPORT_REASONS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                name={`${id}-motif`}
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="accent-gray-900"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${id}-details`} className="block font-medium">
          Précisions (facultatif)
        </label>
        <textarea
          id={`${id}-details`}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={500}
          rows={2}
          className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1"
        />
      </div>
      {error && <ErrorMessage message={error} />}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-gray-900 px-3 py-1 text-white disabled:opacity-60">
          {pending ? 'Envoi…' : 'Envoyer le signalement'}
        </button>
        <button type="button" onClick={() => setStep('closed')} className="rounded border border-gray-300 bg-white px-3 py-1">
          Annuler
        </button>
      </div>
    </form>
  )
}
