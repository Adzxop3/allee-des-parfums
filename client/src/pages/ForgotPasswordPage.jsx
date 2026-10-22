import { useState } from 'react'
import { Link } from 'react-router'
import { apiSend } from '../api.js'
import { ErrorMessage } from '../components/Status.jsx'
import TextField from '../components/TextField.jsx'
import { usePageTitle } from '../usePageTitle.js'

export default function ForgotPasswordPage() {
  usePageTitle('Mot de passe oublié')
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})
  const [pending, setPending] = useState(false)
  const [sentMessage, setSentMessage] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    setFields({})
    try {
      const data = await apiSend('POST', '/api/auth/forgot-password', { email: form.get('email') })
      setSentMessage(data.message)
    } catch (err) {
      setError(err.message)
      setFields(err.fields ?? {})
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Mot de passe oublié</h1>

      {sentMessage ? (
        <div role="status" className="mt-6 rounded border border-gray-200 bg-white p-4">
          <p>{sentMessage}</p>
          <p className="mt-2 text-sm text-gray-600">Le lien est valable une heure. Pensez à vérifier les courriers indésirables.</p>
          <Link to="/connexion" className="mt-3 inline-block underline underline-offset-2">
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-600">
            Indiquez votre adresse email : nous vous enverrons un lien pour choisir un nouveau mot de passe.
          </p>
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            {error && <ErrorMessage message={error} />}
            <TextField label="Email" name="email" type="email" autoComplete="email" required error={fields.email} />
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-60"
            >
              {pending ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>
          <p className="mt-4 text-sm">
            <Link to="/connexion" className="underline underline-offset-2">
              Retour à la connexion
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
