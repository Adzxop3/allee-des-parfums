import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext.js'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import TextField from '../components/TextField.jsx'
import { usePageTitle } from '../usePageTitle.js'

export default function AccountPage() {
  usePageTitle('Mon compte')
  const { user, checking, deleteAccount } = useAuth()
  const location = useLocation()
  const [deleted, setDeleted] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})
  const [pending, setPending] = useState(false)

  async function handleDelete(event) {
    event.preventDefault()
    const password = new FormData(event.currentTarget).get('password')
    setPending(true)
    setError(null)
    setFields({})
    try {
      await deleteAccount(password)
      setDeleted(true)
    } catch (err) {
      setError(err.message)
      setFields(err.fields ?? {})
    } finally {
      setPending(false)
    }
  }

  if (deleted) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold">Compte supprimé</h1>
        <p role="status" className="mt-4 rounded border border-gray-200 bg-white p-4">
          Votre compte et toutes ses données ont été supprimés. Merci d'avoir utilisé le site.
        </p>
        <Link to="/" className="mt-4 inline-block underline underline-offset-2">
          Retour à l'accueil
        </Link>
      </div>
    )
  }

  if (checking) return <Loading />

  if (!user) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold">Mon compte</h1>
        <p className="mt-4">
          <Link to="/connexion" state={{ from: location.pathname }} className="underline underline-offset-2">
            Connectez-vous
          </Link>{' '}
          pour accéder à votre compte.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Mon compte</h1>

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded border border-gray-200 bg-white p-4 text-sm">
        <dt className="text-gray-600">Nom</dt>
        <dd>{user.displayName}</dd>
        <dt className="text-gray-600">Email</dt>
        <dd className="break-all">
          {user.email}{' '}
          <span className={user.emailVerified ? 'text-gray-600' : 'text-amber-800'}>
            ({user.emailVerified ? 'confirmé' : 'non confirmé'})
          </span>
        </dd>
        <dt className="text-gray-600">Inscrit le</dt>
        <dd>{new Date(user.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</dd>
      </dl>

      <PublicProfileSettings />

      <section aria-labelledby="suppression-titre" className="mt-10 rounded border border-red-200 bg-white p-4">
        <h2 id="suppression-titre" className="text-lg font-semibold text-red-800">
          Supprimer mon compte
        </h2>
        <p className="mt-2 text-sm">
          La suppression est <strong>définitive</strong>. Seront effacés : votre compte, vos avis publics et leurs
          commentaires, vos commentaires sur les avis des autres, vos votes « utile » et vos signalements, votre
          parfumothèque (parfums, notes et commentaires personnels), vos préférences du questionnaire, vos sessions
          de connexion, ainsi que l'historique des parfums consultés gardé par ce navigateur.
        </p>
        <form onSubmit={handleDelete} noValidate className="mt-4 space-y-4">
          {error && <ErrorMessage message={error} />}
          <TextField
            label="Confirmez avec votre mot de passe"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            error={fields.password}
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-red-700 px-4 py-2 text-white hover:bg-red-800 disabled:opacity-60"
          >
            {pending ? 'Suppression…' : 'Supprimer définitivement mon compte'}
          </button>
        </form>
      </section>
    </div>
  )
}

// Profil public : lien et choix d'y afficher ses favoris (enregistré dès que la case change)
function PublicProfileSettings() {
  const { user, updateSettings } = useAuth()
  const [status, setStatus] = useState(null) // null | 'saving' | 'saved' | message d'erreur

  async function toggle(event) {
    setStatus('saving')
    try {
      await updateSettings({ showFavorites: event.target.checked })
      setStatus('saved')
    } catch (err) {
      setStatus(err.message)
    }
  }

  return (
    <section aria-labelledby="profil-titre" className="mt-8 rounded border border-gray-200 bg-white p-4">
      <h2 id="profil-titre" className="text-lg font-semibold">
        Profil public
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Votre pseudo et vos avis publiés sont visibles de tous.{' '}
        <Link to={`/membres/${user.id}`} className="underline underline-offset-2">
          Voir mon profil public
        </Link>
      </p>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={user.showFavorites}
          onChange={toggle}
          disabled={status === 'saving'}
          className="mt-0.5 accent-gray-900"
        />
        <span>
          Afficher mes parfums favoris sur mon profil public
          <span className="block text-gray-600">Les parfums notés 5 étoiles dans votre parfumothèque.</span>
        </span>
      </label>
      <p role="status" className="mt-2 text-sm text-gray-700">
        {status === 'saved' && 'Préférence enregistrée.'}
      </p>
      {status && !['saving', 'saved'].includes(status) && <ErrorMessage message={status} />}
    </section>
  )
}
