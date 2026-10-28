import { useState } from 'react'
import { Link } from 'react-router'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import { COLLECTION_STATUSES } from '../labels.js'
import { chipClass } from '../ui/styles.js'
import { useFetch } from '../useFetch.js'
import RequireVerifiedEmail from './RequireVerifiedEmail.jsx'
import StarRating from './StarRating.jsx'
import { ErrorMessage } from './Status.jsx'

// Bloc « Ma parfumothèque » de la fiche parfum
export default function CollectionControl({ perfumeId }) {
  const { user } = useAuth()
  const [invite, setInvite] = useState(false)

  if (user?.emailVerified) return <CollectionEditor perfumeId={perfumeId} />

  // Pas connecté ou email non confirmé : le bouton invite à le faire
  return invite ? (
    <RequireVerifiedEmail feature="ajouter ce parfum à votre parfumothèque" />
  ) : (
    <button
      type="button"
      onClick={() => setInvite(true)}
      className={chipClass(false)}
    >
      Ajouter à ma collection
    </button>
  )
}

function CollectionEditor({ perfumeId }) {
  const { data, error: loadError, loading, reload } = useFetch(`/api/collection/${perfumeId}`)
  const [saved, setSaved] = useState(undefined) // dernière version renvoyée par l'API après une modification
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const item = saved !== undefined ? saved : data?.item

  async function save(request) {
    setPending(true)
    setError(null)
    try {
      setSaved(await request())
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  const setStatus = (status) =>
    save(async () =>
      item
        ? (await apiSend('PATCH', `/api/collection/${perfumeId}`, { status })).item
        : (await apiSend('POST', '/api/collection', { perfumeId, status })).item,
    )
  const setRating = (rating) =>
    save(async () => (await apiSend('PATCH', `/api/collection/${perfumeId}`, { rating })).item)
  const remove = () =>
    save(async () => {
      await apiSend('DELETE', `/api/collection/${perfumeId}`)
      return null
    })

  if (loadError) return <ErrorMessage message={loadError} onRetry={reload} />
  if (loading && saved === undefined) return null

  return (
    <div className="space-y-2">
      <div role="group" aria-label="Ma parfumothèque" className="flex flex-wrap gap-2">
        {Object.entries(COLLECTION_STATUSES).map(([status, labels]) => {
          const selected = item?.status === status
          return (
            <button
              key={status}
              type="button"
              aria-pressed={selected}
              disabled={pending}
              onClick={() => !selected && setStatus(status)}
              className={`${chipClass(selected)} disabled:opacity-60`}
            >
              {labels.action}
            </button>
          )
        })}
      </div>

      {item && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {item.status !== 'wishlist' && (
            <StarRating name={`note-${perfumeId}`} value={item.rating} onChange={setRating} disabled={pending} />
          )}
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-sm text-muted link"
          >
            Retirer de ma collection
          </button>
          <Link to={`/parfumotheque?statut=${item.status}`} className="text-sm link">
            Voir ma parfumothèque
          </Link>
        </div>
      )}

      {error && <ErrorMessage message={error} />}
    </div>
  )
}
