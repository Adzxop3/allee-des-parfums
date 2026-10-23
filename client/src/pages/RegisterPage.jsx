import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext.js'
import { ErrorMessage } from '../components/Status.jsx'
import TextField from '../components/TextField.jsx'
import { usePageTitle } from '../usePageTitle.js'

export default function RegisterPage() {
  usePageTitle('Créer un compte')
  const { user, register } = useAuth()
  const location = useLocation()
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})
  const [pending, setPending] = useState(false)

  if (user) return <Navigate to={location.state?.from ?? '/'} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    setFields({})
    try {
      await register({
        displayName: form.get('displayName'),
        email: form.get('email'),
        password: form.get('password'),
      })
    } catch (err) {
      setError(err.message)
      setFields(err.fields ?? {})
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Créer un compte</h1>
      <p className="mt-1 text-sm text-gray-600">
        Déjà inscrit ?{' '}
        <Link to="/connexion" state={location.state} className="underline underline-offset-2">
          Se connecter
        </Link>
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {error && <ErrorMessage message={error} />}
        <TextField
          label="Nom affiché"
          name="displayName"
          autoComplete="nickname"
          maxLength={50}
          required
          error={fields.displayName}
        />
        <TextField label="Email" name="email" type="email" autoComplete="email" required error={fields.email} />
        <TextField
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          hint="8 caractères minimum."
          error={fields.password}
        />
        <p className="text-sm text-gray-600">
          En créant un compte, vous acceptez les{' '}
          <Link to="/conditions" className="underline underline-offset-2">
            conditions d'utilisation
          </Link>{' '}
          et la{' '}
          <Link to="/confidentialite" className="underline underline-offset-2">
            politique de confidentialité
          </Link>
          . Votre pseudo et vos avis seront publics.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {pending ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
    </div>
  )
}
