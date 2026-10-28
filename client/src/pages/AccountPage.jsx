import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext.js'
import LoginPrompt from '../components/LoginPrompt.jsx'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import TextField from '../components/TextField.jsx'
import { formatDate } from '../format.js'
import { buttonClass } from '../ui/styles.js'
import { usePageTitle } from '../usePageTitle.js'

export default function AccountPage() {
  usePageTitle('Mon compte')
  const { user, checking, deleteAccount } = useAuth()
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
        <p role="status" className="mt-4 card p-4">
          Votre compte et toutes ses données ont été supprimés. Merci d'avoir utilisé le site.
        </p>
        <Link to="/" className="mt-4 inline-block link">
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
          <LoginPrompt>pour accéder à votre compte.</LoginPrompt>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Mon compte</h1>

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 card p-4 text-sm">
        <dt className="text-muted">Nom</dt>
        <dd>{user.displayName}</dd>
        <dt className="text-muted">Email</dt>
        <dd className="break-all">
          {user.email}{' '}
          <span className={user.emailVerified ? 'text-muted' : 'text-notice'}>
            ({user.emailVerified ? 'confirmé' : 'non confirmé'})
          </span>
        </dd>
        <dt className="text-muted">Inscrit le</dt>
        <dd>{formatDate(user.createdAt)}</dd>
      </dl>

      <PublicProfileSettings />

      <section aria-labelledby="suppression-titre" className="mt-10 rounded border border-danger-line bg-surface p-4">
        <h2 id="suppression-titre" className="text-lg font-semibold text-danger">
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
            className={buttonClass({ variant: 'danger' })}
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
    <section aria-labelledby="profil-titre" className="mt-8 card p-4">
      <h2 id="profil-titre" className="text-lg font-semibold">
        Profil public
      </h2>
      <p className="mt-2 text-sm text-muted">
        Votre pseudo et vos avis publiés sont visibles de tous.{' '}
        <Link to={`/membres/${user.id}`} className="link">
          Voir mon profil public
        </Link>
      </p>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={user.showFavorites}
          onChange={toggle}
          disabled={status === 'saving'}
          className="mt-0.5 accent-accent"
        />
        <span>
          Afficher mes parfums favoris sur mon profil public
          <span className="block text-muted">Les parfums notés 5 étoiles dans votre parfumothèque.</span>
        </span>
      </label>
      <p role="status" className="mt-2 text-sm text-ink-soft">
        {status === 'saved' && 'Préférence enregistrée.'}
      </p>
      {status && !['saving', 'saved'].includes(status) && <ErrorMessage message={status} />}
    </section>
  )
}
