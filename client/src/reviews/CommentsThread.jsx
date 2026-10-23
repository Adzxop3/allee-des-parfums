import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import { useFetch } from '../useFetch.js'
import ReportButton from './ReportButton.jsx'

const BODY_MAX = 1000
const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', { dateStyle: 'long' })

// Fil de commentaires d'un avis, replié par défaut. Le bouton indique le nombre de commentaires.
// before : éléments affichés sur la même ligne que ce bouton (le vote « utile »)
export default function CommentsThread({ review, before }) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(review.commentCount)
  const panelId = `commentaires-${review.id}`

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        {before}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm hover:border-gray-500"
        >
          {count === 0 ? 'Répondre' : `${count} commentaire${count > 1 ? 's' : ''}`}
          <span aria-hidden="true"> {open ? '▴' : '▾'}</span>
        </button>
      </div>
      {open && <Comments id={panelId} reviewId={review.id} onCountChange={(delta) => setCount((n) => n + delta)} />}
    </div>
  )
}

function Comments({ id, reviewId, onCountChange }) {
  const { user } = useAuth()
  const location = useLocation()
  const list = useFetch(`/api/reviews/${reviewId}/comments`)
  const [body, setBody] = useState('')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // id du commentaire à confirmer

  async function submit(event) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await apiSend('POST', `/api/reviews/${reviewId}/comments`, { body })
      setBody('')
      onCountChange(1)
      list.reload()
    } catch (err) {
      setError(err.fields?.body ?? err.message)
    } finally {
      setPending(false)
    }
  }

  async function remove(comment) {
    try {
      await apiSend('DELETE', `/api/comments/${comment.id}`)
      if (comment.status === 'published') onCountChange(-1)
      setConfirmDelete(null)
      list.reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div id={id} className="mt-3 space-y-3 border-l-2 border-gray-200 pl-3 sm:pl-4">
      {list.error && <ErrorMessage message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data && (
        <ul className={`space-y-3 ${list.loading ? 'opacity-50' : ''}`}>
          {list.data.comments.map((comment) => (
            <li key={comment.id} className="text-sm">
              <p className="text-gray-600">
                <Link
                  to={`/membres/${comment.author.id}`}
                  className="font-medium text-gray-900 underline underline-offset-2"
                >
                  {comment.author.displayName}
                </Link>
                , le{' '}
                {formatDate(comment.createdAt)}
              </p>
              <p className="mt-0.5 whitespace-pre-line break-words">{comment.body}</p>
              {comment.status === 'hidden' && (
                <p className="mt-1 text-amber-900">Masqué par la modération : visible par vous seul.</p>
              )}
              {comment.author.id !== user?.id && (
                <div className="mt-1">
                  <ReportButton targetType="comment" targetId={comment.id} />
                </div>
              )}
              {comment.author.id === user?.id &&
                (confirmDelete === comment.id ? (
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    Supprimer ce commentaire ?
                    <button type="button" onClick={() => remove(comment)} className="rounded bg-red-700 px-2 py-0.5 text-white">
                      Supprimer
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className="rounded border border-gray-300 px-2 py-0.5">
                      Annuler
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(comment.id)}
                    className="mt-1 text-gray-600 underline underline-offset-2"
                  >
                    Supprimer
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}

      {user?.emailVerified ? (
        <form onSubmit={submit} noValidate className="space-y-2">
          <label htmlFor={`${id}-texte`} className="block text-sm font-medium">
            Votre réponse
          </label>
          <textarea
            id={`${id}-texte`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={BODY_MAX}
            rows={3}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-aide${error ? ` ${id}-erreur` : ''}`}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <p id={`${id}-aide`} className="text-xs text-gray-600">
            {body.length} / {BODY_MAX} caractères
          </p>
          {error && (
            <p id={`${id}-erreur`} className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending} className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-60">
            {pending ? 'Envoi…' : 'Répondre'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-600">
          {user ? (
            'Confirmez votre adresse email pour répondre.'
          ) : (
            <>
              <Link to="/connexion" state={{ from: location.pathname }} className="underline underline-offset-2">
                Connectez-vous
              </Link>{' '}
              pour répondre.
            </>
          )}
        </p>
      )}
    </div>
  )
}
