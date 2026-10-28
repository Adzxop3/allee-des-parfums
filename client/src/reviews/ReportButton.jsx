import { useId, useState } from 'react'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import LoginPrompt from '../components/LoginPrompt.jsx'
import { ErrorMessage } from '../components/Status.jsx'
import { REPORT_REASONS } from '../labels.js'
import { buttonClass, inputClass } from '../ui/styles.js'

// « Signaler » un avis ou un commentaire : choix du motif, précision facultative.
// targetType : 'review' | 'comment'
export default function ReportButton({ targetType, targetId }) {
  const { user } = useAuth()
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
      <p role="status" className="text-sm text-ink-soft">
        Merci, votre signalement a été transmis à la modération.
      </p>
    )
  }

  if (step === 'closed') {
    return (
      <button type="button" onClick={() => setStep('form')} className="text-sm text-muted link">
        Signaler
      </button>
    )
  }

  if (!user?.emailVerified) {
    return (
      <p className="text-sm text-muted">
        {user ? (
          'Confirmez votre adresse email pour signaler un contenu.'
        ) : (
          <>
            <LoginPrompt>pour signaler un contenu.</LoginPrompt>
          </>
        )}
      </p>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="mt-2 w-full space-y-3 rounded-lg border border-line bg-paper p-3 text-sm">
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
                className="accent-accent"
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
          className={inputClass({ size: 'sm', className: 'mt-1 w-full' })}
        />
      </div>
      {error && <ErrorMessage message={error} />}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass({ size: 'sm' })}>
          {pending ? 'Envoi…' : 'Envoyer le signalement'}
        </button>
        <button type="button" onClick={() => setStep('closed')} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
          Annuler
        </button>
      </div>
    </form>
  )
}
