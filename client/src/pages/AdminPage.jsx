import { useId, useState } from 'react'
import { Link } from 'react-router'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import Pagination from '../components/Pagination.jsx'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import { MODERATION_ACTIONS, REPORT_REASONS } from '../labels.js'
import { useFetch } from '../useFetch.js'
import { usePageTitle } from '../usePageTitle.js'

const TYPES = { review: 'Avis', comment: 'Commentaire' }
const formatDate = (date) => new Date(date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

// Administration (rôle admin) : signalements en attente et journal des décisions.
// Le serveur vérifie le rôle sur chaque route ; cette page ne fait que l'afficher.
export default function AdminPage() {
  usePageTitle('Modération')
  const { user, checking } = useAuth()
  const [tab, setTab] = useState('reports')

  if (checking) return <Loading />
  if (!user?.isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Modération</h1>
        <p className="mt-4 text-gray-600">Accès réservé aux modérateurs.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Modération</h1>
      <div role="tablist" aria-label="Sections de la modération" className="mt-4 flex gap-1 border-b border-gray-200">
        {[
          ['reports', 'Signalements en attente'],
          ['log', 'Journal des décisions'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`onglet-${key}`}
            aria-selected={tab === key}
            aria-controls="panneau-moderation"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === key ? 'border-gray-900 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="panneau-moderation" aria-labelledby={`onglet-${tab}`} className="mt-4">
        {tab === 'reports' ? <Reports /> : <Log />}
      </div>
    </div>
  )
}

function Reports() {
  const list = useFetch('/api/admin/reports')

  if (list.error) return <ErrorMessage message={list.error} onRetry={list.reload} />
  if (!list.data) return <Loading />
  if (list.data.groups.length === 0) return <p className="text-gray-600">Aucun signalement en attente.</p>

  return (
    <ul className={`space-y-4 ${list.loading ? 'opacity-50' : ''}`}>
      {list.data.groups.map((group) => (
        <ReportGroup key={`${group.targetType}-${group.targetId}`} group={group} onDone={list.reload} />
      ))}
    </ul>
  )
}

// Un contenu signalé : le contenu, les signalements reçus et les actions possibles
function ReportGroup({ group, onDone }) {
  const id = useId()
  const [note, setNote] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const { content } = group

  async function moderate(action) {
    setPending(true)
    setError(null)
    try {
      await apiSend('POST', '/api/admin/moderate', {
        targetType: group.targetType,
        targetId: group.targetId,
        action,
        note,
      })
      onDone()
    } catch (err) {
      setError(err.message)
      setPending(false)
    }
  }

  return (
    <li className="rounded border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{TYPES[group.targetType]}</span> · {group.count} signalement
        {group.count > 1 ? 's' : ''}
        {content?.status === 'hidden' && ' · déjà masqué'}
      </p>

      {content ? (
        <div className="mt-2 rounded bg-gray-50 p-3">
          {content.title && <p className="font-semibold">{content.title}</p>}
          <p className="whitespace-pre-line break-words">{content.body}</p>
          <p className="mt-2 text-sm text-gray-600">
            Par{' '}
            <Link to={`/membres/${content.author.id}`} className="underline underline-offset-2">
              {content.author.displayName}
            </Link>{' '}
            le {formatDate(content.createdAt)}, sur{' '}
            <Link to={`/perfumes/${content.perfume.id}`} className="underline underline-offset-2">
              {content.perfume.name}
            </Link>
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-gray-600">Ce contenu a déjà été supprimé (par son auteur par exemple).</p>
      )}

      <ul className="mt-3 space-y-1 text-sm">
        {group.reports.map((report, i) => (
          <li key={i}>
            <span className="font-medium">{REPORT_REASONS[report.reason]}</span> — par {report.reporter}, le{' '}
            {formatDate(report.createdAt)}
            {report.details && <span className="block text-gray-700">« {report.details} »</span>}
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <label htmlFor={`${id}-note`} className="block text-sm font-medium">
          Note pour le journal (facultatif)
        </label>
        <input
          id={`${id}-note`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {content?.status === 'published' && (
          <button type="button" disabled={pending} onClick={() => moderate('hide')} className="rounded bg-gray-900 px-3 py-1.5 text-white disabled:opacity-60">
            Masquer
          </button>
        )}
        {content &&
          (confirmDelete ? (
            <span className="flex flex-wrap items-center gap-2">
              Supprimer définitivement ?
              <button type="button" disabled={pending} onClick={() => moderate('delete')} className="rounded bg-red-700 px-3 py-1.5 text-white disabled:opacity-60">
                Supprimer
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded border border-gray-300 px-3 py-1.5">
                Annuler
              </button>
            </span>
          ) : (
            <button type="button" disabled={pending} onClick={() => setConfirmDelete(true)} className="rounded border border-red-300 px-3 py-1.5 text-red-800">
              Supprimer…
            </button>
          ))}
        <button type="button" disabled={pending} onClick={() => moderate('ignore')} className="rounded border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-60">
          Ignorer
        </button>
      </div>
      {error && (
        <div className="mt-2">
          <ErrorMessage message={error} />
        </div>
      )}
    </li>
  )
}

function Log() {
  const [page, setPage] = useState(1)
  const log = useFetch(`/api/admin/log?page=${page}`)

  if (log.error) return <ErrorMessage message={log.error} onRetry={log.reload} />
  if (!log.data) return <Loading />
  if (log.data.total === 0) return <p className="text-gray-600">Aucune décision pour le moment.</p>

  return (
    <div>
      <ul className={`space-y-2 ${log.loading ? 'opacity-50' : ''}`}>
        {log.data.entries.map((entry) => (
          <li key={entry.id} className="rounded border border-gray-200 bg-white p-3 text-sm">
            <p>
              <span className="font-semibold">{MODERATION_ACTIONS[entry.action]}</span> · {TYPES[entry.targetType]} n°
              {entry.targetId} · {entry.reports} signalement{entry.reports > 1 ? 's' : ''} clos
            </p>
            <p className="text-gray-600">
              {formatDate(entry.createdAt)} par {entry.adminName ?? 'un modérateur supprimé'}
            </p>
            {entry.excerpt && <p className="mt-1 break-words text-gray-700">« {entry.excerpt} »</p>}
            {entry.note && <p className="mt-1">Note : {entry.note}</p>}
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={Math.ceil(log.data.total / log.data.limit)} onChange={setPage} />
    </div>
  )
}
