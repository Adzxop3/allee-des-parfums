import { useState } from 'react'
import { Link } from 'react-router'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import LoginPrompt from '../components/LoginPrompt.jsx'
import Pagination from '../components/Pagination.jsx'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import { formatDate } from '../format.js'
import { buttonClass, chipClass, inputClass } from '../ui/styles.js'
import { useFetch } from '../useFetch.js'
import ReportButton from './ReportButton.jsx'

const BODY_MAX = 1000

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
          className={chipClass(false)}
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
  const [page, setPage] = useState(1)
  const list = useFetch(`/api/reviews/${reviewId}/comments?page=${page}`)
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
      // Le nouveau commentaire est le dernier : on affiche la dernière page
      const lastPage = Math.ceil((list.data.total + 1) / list.data.limit)
      if (lastPage === page) list.reload()
      else setPage(lastPage)
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
      if (list.data.comments.length === 1 && page > 1) setPage(page - 1)
      else list.reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div id={id} className="mt-3 space-y-3 border-l-2 border-line pl-3 sm:pl-4">
      {list.error && <ErrorMessage message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data && (
        <ul className={`space-y-3 ${list.loading ? 'opacity-50' : ''}`}>
          {list.data.comments.map((comment) => (
            <li key={comment.id} className="text-sm">
              <p className="text-muted">
                <Link
                  to={`/membres/${comment.author.id}`}
                  className="font-medium text-ink link"
                >
                  {comment.author.displayName}
                </Link>
                , le{' '}
                {formatDate(comment.createdAt)}
              </p>
              <p className="mt-0.5 whitespace-pre-line break-words">{comment.body}</p>
              {comment.status === 'hidden' && (
                <p className="mt-1 text-notice">Masqué par la modération : visible par vous seul.</p>
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
                    <button type="button" onClick={() => remove(comment)} className={buttonClass({ variant: 'danger', size: 'sm' })}>
                      Supprimer
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                      Annuler
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(comment.id)}
                    className="mt-1 text-muted link"
                  >
                    Supprimer
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
      {list.data && (
        <Pagination page={page} totalPages={Math.ceil(list.data.total / list.data.limit)} onChange={setPage} />
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
            className={inputClass({ className: 'w-full' })}
          />
          <p id={`${id}-aide`} className="text-xs text-muted">
            {body.length} / {BODY_MAX} caractères
          </p>
          {error && (
            <p id={`${id}-erreur`} className="text-sm text-danger">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending} className={buttonClass({ size: 'sm' })}>
            {pending ? 'Envoi…' : 'Répondre'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted">
          {user ? (
            'Confirmez votre adresse email pour répondre.'
          ) : (
            <>
              <LoginPrompt>pour répondre.</LoginPrompt>
            </>
          )}
        </p>
      )}
    </div>
  )
}
