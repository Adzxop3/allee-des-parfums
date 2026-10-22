import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext.js'
import { ErrorMessage } from '../components/Status.jsx'
import TextField from '../components/TextField.jsx'
import { usePageTitle } from '../usePageTitle.js'

export default function LoginPage() {
  usePageTitle('Connexion')
  const { user, login } = useAuth()
  const location = useLocation()
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})
  const [pending, setPending] = useState(false)

  // Une fois connecté, retour à la page qui a demandé la connexion (ou à l'accueil)
  if (user) return <Navigate to={location.state?.from ?? '/'} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    setFields({})
    try {
      await login(form.get('email'), form.get('password'))
    } catch (err) {
      setError(err.message)
      setFields(err.fields ?? {})
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="mt-1 text-sm text-gray-600">
        Pas encore de compte ?{' '}
        <Link to="/inscription" state={location.state} className="underline underline-offset-2">
          Créer un compte
        </Link>
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {error && <ErrorMessage message={error} />}
        <TextField label="Email" name="email" type="email" autoComplete="email" required error={fields.email} />
        <TextField
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={fields.password}
        />
        <p className="text-sm">
          <Link to="/mot-de-passe-oublie" className="underline underline-offset-2">
            Mot de passe oublié ?
          </Link>
        </p>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {pending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
