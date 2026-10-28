import { useState } from 'react'
import { Link } from 'react-router'
import { apiSend } from '../api.js'
import { COLLECTION_STATUSES } from '../labels.js'
import { buttonClass, inputClass } from '../ui/styles.js'
import PerfumeImage from './PerfumeImage.jsx'
import StarRating from './StarRating.jsx'
import { ErrorMessage } from './Status.jsx'

// Un parfum de la parfumothèque, modifiable sur place. onChanged() recharge la liste après une modification.
export default function CollectionItem({ item, onChanged }) {
  const [editingNote, setEditingNote] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const url = `/api/collection/${item.id}`

  async function run(request) {
    setPending(true)
    setError(null)
    try {
      await request()
      onChanged()
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setPending(false)
    }
  }

  async function saveNote(event) {
    event.preventDefault()
    const personalNote = new FormData(event.currentTarget).get('personalNote')
    if (await run(() => apiSend('PATCH', url, { personalNote }))) setEditingNote(false)
  }

  return (
    <li className="flex gap-3 card p-3">
      {/* Doublon du lien sur le nom : masqué aux lecteurs d'écran et hors de la navigation clavier */}
      <Link to={`/perfumes/${item.id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
        <PerfumeImage src={item.image_url} small className="h-24 w-18 object-contain" />
      </Link>

      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <Link to={`/perfumes/${item.id}`} className="font-medium leading-tight hover:underline">
            {item.name}
          </Link>
          <p className="text-sm text-muted">{[item.brand, item.year].filter(Boolean).join(' · ')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Statut :</span>
            <select
              value={item.status}
              disabled={pending}
              onChange={(event) => run(() => apiSend('PATCH', url, { status: event.target.value }))}
              className={inputClass({ size: 'sm' })}
            >
              {Object.entries(COLLECTION_STATUSES).map(([status, labels]) => (
                <option key={status} value={status}>
                  {labels.action}
                </option>
              ))}
            </select>
          </label>
          {item.status !== 'wishlist' && (
            <StarRating
              name={`note-${item.id}`}
              value={item.rating}
              disabled={pending}
              onChange={(rating) => run(() => apiSend('PATCH', url, { rating }))}
            />
          )}
        </div>

        {editingNote ? (
          <form onSubmit={saveNote} className="space-y-2">
            <label htmlFor={`commentaire-${item.id}`} className="block text-sm font-medium">
              Mon commentaire
            </label>
            <textarea
              id={`commentaire-${item.id}`}
              name="personalNote"
              defaultValue={item.personalNote ?? ''}
              maxLength={1000}
              rows={3}
              className={inputClass({ size: 'sm', className: 'w-full' })}
            />
            <div className="flex gap-2 text-sm">
              <button type="submit" disabled={pending} className={buttonClass({ size: 'sm' })}>
                Enregistrer
              </button>
              <button type="button" onClick={() => setEditingNote(false)} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <div className="text-sm">
            {item.personalNote && <p className="whitespace-pre-line text-ink-soft">« {item.personalNote} »</p>}
            <button type="button" onClick={() => setEditingNote(true)} className="text-muted link">
              {item.personalNote ? 'Modifier mon commentaire' : 'Ajouter un commentaire'}
            </button>
          </div>
        )}

        <div className="text-sm">
          {confirmRemove ? (
            <span className="flex flex-wrap items-center gap-2">
              Retirer ce parfum de votre collection ?
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => apiSend('DELETE', url))}
                className={buttonClass({ variant: 'danger', size: 'sm' })}
              >
                Retirer
              </button>
              <button type="button" onClick={() => setConfirmRemove(false)} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                Annuler
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmRemove(true)} className="text-muted link">
              Retirer de ma collection
            </button>
          )}
        </div>

        {error && <ErrorMessage message={error} />}
      </div>
    </li>
  )
}
