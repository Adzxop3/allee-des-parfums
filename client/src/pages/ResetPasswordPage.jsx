import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import { ErrorMessage } from '../components/Status.jsx'
import TextField from '../components/TextField.jsx'
import { buttonClass } from '../ui/styles.js'
import { usePageTitle } from '../usePageTitle.js'

// Ouverte depuis le lien reçu par email : /reinitialiser-mot-de-passe?token=...
export default function ResetPasswordPage() {
  usePageTitle('Nouveau mot de passe')
  const [params] = useSearchParams()
  const token = params.get('token')
  const { refresh } = useAuth()
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    setFields({})
    try {
      await apiSend('POST', '/api/auth/reset-password', { token, password: form.get('password') })
      setDone(true)
      refresh() // toutes les sessions ont été fermées, y compris celle de ce navigateur
    } catch (err) {
      setError(err.message)
      setFields(err.fields ?? {})
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>

      {!token ? (
        <div className="mt-6">
          <ErrorMessage message="Ce lien est incomplet." />
          <Link to="/mot-de-passe-oublie" className="mt-3 inline-block link">
            Demander un nouveau lien
          </Link>
        </div>
      ) : done ? (
        <div role="status" className="mt-6 card p-4">
          <p>Votre mot de passe a été changé. Par sécurité, vous avez été déconnecté de tous vos appareils.</p>
          <Link to="/connexion" className="mt-3 inline-block link">
            Se connecter
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          {error && <ErrorMessage message={error} />}
          {error && !Object.keys(fields).length && (
            <Link to="/mot-de-passe-oublie" className="inline-block text-sm link">
              Demander un nouveau lien
            </Link>
          )}
          <TextField
            label="Nouveau mot de passe"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            hint="8 caractères minimum."
            error={fields.password}
          />
          <button
            type="submit"
            disabled={pending}
            className={buttonClass({ className: 'w-full' })}
          >
            {pending ? 'Enregistrement…' : 'Changer le mot de passe'}
          </button>
        </form>
      )}
    </div>
  )
}
