import { useEffect, useState } from 'react'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import Pagination from '../components/Pagination.jsx'
import RequireVerifiedEmail from '../components/RequireVerifiedEmail.jsx'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import { buttonClass, inputClass } from '../ui/styles.js'
import { useFetch } from '../useFetch.js'
import CommentsThread from './CommentsThread.jsx'
import HelpfulButton from './HelpfulButton.jsx'
import ReportButton from './ReportButton.jsx'
import ReviewCard from './ReviewCard.jsx'
import ReviewForm from './ReviewForm.jsx'

// Section « Avis de la communauté » de la fiche parfum.
// onSummaryChange(summary) : la moyenne a changé (affichée en haut de la fiche)
export default function ReviewsSection({ perfumeId, onSummaryChange }) {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('recent')
  const list = useFetch(`/api/perfumes/${perfumeId}/reviews?page=${page}&sort=${sort}`)

  const reload = () => {
    list.reload()
    apiSend('GET', `/api/perfumes/${perfumeId}/reviews?page=1`)
      .then((data) => onSummaryChange(data.summary))
      .catch(() => {})
  }

  return (
    <section id="avis" aria-labelledby="avis-titre" className="mt-10 border-t border-line pt-6">
      <h2 id="avis-titre" className="text-xl font-semibold">
        Avis de la communauté
      </h2>
      {list.data && (
        <p className="mt-1 text-sm text-muted">
          {list.data.summary.count === 0
            ? 'Aucun avis pour le moment.'
            : `${list.data.summary.count} avis, note moyenne ${list.data.summary.average.toLocaleString('fr-FR')} / 5`}
        </p>
      )}

      <div className="mt-4">
        {user?.emailVerified ? (
          <MyReview key={`${perfumeId}-${user.id}`} perfumeId={perfumeId} onChange={reload} />
        ) : (
          <WriteInvite />
        )}
      </div>

      <div className="mt-6 space-y-4">
        {list.data?.summary.count > 1 && (
          <label className="flex items-center gap-2 text-sm">
            Trier les avis :
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value)
                setPage(1)
              }}
              className={inputClass({ size: 'sm' })}
            >
              <option value="recent">Les plus récents</option>
              <option value="useful">Les plus utiles</option>
            </select>
          </label>
        )}
        {list.error && <ErrorMessage message={list.error} onRetry={list.reload} />}
        {list.loading && !list.data && <Loading />}
        {list.data?.reviews
          .filter((review) => review.author.id !== user?.id) // mon avis est affiché au-dessus
          .map((review) => (
            <ReviewCard key={review.id} review={review}>
              <CommentsThread review={review} before={<HelpfulButton review={review} isOwn={false} />} />
              <div className="mt-3">
                <ReportButton targetType="review" targetId={review.id} />
              </div>
            </ReviewCard>
          ))}
        {list.data && (
          <Pagination
            page={page}
            totalPages={Math.ceil(list.data.total / list.data.limit)}
            onChange={(newPage) => {
              setPage(newPage)
              document.getElementById('avis')?.scrollIntoView()
            }}
          />
        )}
      </div>
    </section>
  )
}

// Pas connecté ou email non confirmé : le bouton invite à le faire
function WriteInvite() {
  const [open, setOpen] = useState(false)
  return open ? (
    <RequireVerifiedEmail feature="donner votre avis" />
  ) : (
    <button type="button" onClick={() => setOpen(true)} className={buttonClass()}>
      Écrire un avis
    </button>
  )
}

// Mon avis sur ce parfum : bouton pour l'écrire, ou l'avis existant avec Modifier / Supprimer
function MyReview({ perfumeId, onChange }) {
  const [state, setState] = useState({ loaded: false, review: null, collectionRating: null })
  const [mode, setMode] = useState('view') // 'view' | 'form'
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      apiSend('GET', `/api/perfumes/${perfumeId}/reviews/mine`),
      apiSend('GET', `/api/collection/${perfumeId}`).catch(() => ({ item: null })),
    ])
      .then(([mine, collection]) =>
        setState({ loaded: true, review: mine.review, collectionRating: collection.item?.rating ?? null }),
      )
      .catch((err) => setError(err.message))
  }, [perfumeId])

  async function remove() {
    try {
      await apiSend('DELETE', `/api/reviews/${state.review.id}`)
      setState({ ...state, review: null })
      setConfirmDelete(false)
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  function saved(review) {
    setState({ ...state, review })
    setMode('view')
    onChange()
  }

  if (error) return <ErrorMessage message={error} />
  if (!state.loaded) return <Loading />

  if (mode === 'form') {
    return (
      <ReviewForm
        perfumeId={perfumeId}
        review={state.review}
        initialRating={state.collectionRating}
        onSaved={saved}
        onCancel={() => setMode('view')}
      />
    )
  }

  if (!state.review) {
    return (
      <button type="button" onClick={() => setMode('form')} className={buttonClass()}>
        Écrire un avis
      </button>
    )
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink-soft">Votre avis</h3>
      <ReviewCard review={state.review}>
        {state.review.status === 'hidden' && (
          <p className="mt-3 rounded bg-notice-bg px-3 py-2 text-sm text-notice">
            Cet avis a été masqué par la modération : il n'est plus visible des autres membres.
          </p>
        )}
        <CommentsThread review={state.review} before={<HelpfulButton review={state.review} isOwn />} />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <button type="button" onClick={() => setMode('form')} className="link">
            Modifier
          </button>
          {confirmDelete ? (
            <span className="flex flex-wrap items-center gap-2">
              Supprimer définitivement votre avis ?
              <button type="button" onClick={remove} className={buttonClass({ variant: 'danger', size: 'sm' })}>
                Supprimer
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                Annuler
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-muted link">
              Supprimer
            </button>
          )}
        </div>
      </ReviewCard>
    </div>
  )
}
