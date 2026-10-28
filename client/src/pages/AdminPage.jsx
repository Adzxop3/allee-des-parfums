import { useId, useState } from 'react'
import { Link } from 'react-router'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import Pagination from '../components/Pagination.jsx'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import Tabs from '../components/Tabs.jsx'
import { formatDateTime } from '../format.js'
import { MODERATION_ACTIONS, REPORT_REASONS } from '../labels.js'
import { buttonClass, inputClass } from '../ui/styles.js'
import { useFetch } from '../useFetch.js'
import { usePageTitle } from '../usePageTitle.js'

const TYPES = { review: 'Avis', comment: 'Commentaire' }

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
        <p className="mt-4 text-muted">Accès réservé aux modérateurs.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Modération</h1>
      <Tabs
        tabs={[
          { key: 'reports', label: 'Signalements en attente' },
          { key: 'log', label: 'Journal des décisions' },
        ]}
        value={tab}
        onChange={setTab}
        label="Sections de la modération"
        panelId="panneau-moderation"
        className="mt-4"
      />
      <div role="tabpanel" id="panneau-moderation" aria-labelledby={`onglet-${tab}`} className="mt-4">
        {tab === 'reports' ? <Reports /> : <Log />}
      </div>
    </div>
  )
}

function Reports() {
  const [page, setPage] = useState(1)
  const list = useFetch(`/api/admin/reports?page=${page}`)

  if (list.error) return <ErrorMessage message={list.error} onRetry={list.reload} />
  if (!list.data) return <Loading />
  if (list.data.total === 0) return <p className="text-muted">Aucun signalement en attente.</p>

  // Décision prise : le contenu quitte la liste ; si c'était le dernier de la page, page précédente
  const onDone = () => (list.data.groups.length === 1 && page > 1 ? setPage(page - 1) : list.reload())

  return (
    <div>
      <ul className={`space-y-4 ${list.loading ? 'opacity-50' : ''}`}>
        {list.data.groups.map((group) => (
          <ReportGroup key={`${group.targetType}-${group.targetId}`} group={group} onDone={onDone} />
        ))}
      </ul>
      <Pagination page={page} totalPages={Math.ceil(list.data.total / list.data.limit)} onChange={setPage} />
    </div>
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
    <li className="card p-4">
      <p className="text-sm text-muted">
        <span className="font-semibold text-ink">{TYPES[group.targetType]}</span> · {group.count} signalement
        {group.count > 1 ? 's' : ''}
        {content?.status === 'hidden' && ' · déjà masqué'}
      </p>

      {content ? (
        <div className="mt-2 rounded bg-paper p-3">
          {content.title && <p className="font-semibold">{content.title}</p>}
          <p className="whitespace-pre-line break-words">{content.body}</p>
          <p className="mt-2 text-sm text-muted">
            Par{' '}
            <Link to={`/membres/${content.author.id}`} className="link">
              {content.author.displayName}
            </Link>{' '}
            le {formatDateTime(content.createdAt)}, sur{' '}
            <Link to={`/perfumes/${content.perfume.id}`} className="link">
              {content.perfume.name}
            </Link>
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">Ce contenu a déjà été supprimé (par son auteur par exemple).</p>
      )}

      <ul className="mt-3 space-y-1 text-sm">
        {group.reports.map((report, i) => (
          <li key={i}>
            <span className="font-medium">{REPORT_REASONS[report.reason]}</span> — par {report.reporter}, le{' '}
            {formatDateTime(report.createdAt)}
            {report.details && <span className="block text-ink-soft">« {report.details} »</span>}
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
          className={inputClass({ size: 'sm', className: 'mt-1 w-full' })}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {content?.status === 'published' && (
          <button type="button" disabled={pending} onClick={() => moderate('hide')} className={buttonClass({ size: 'sm' })}>
            Masquer
          </button>
        )}
        {content &&
          (confirmDelete ? (
            <span className="flex flex-wrap items-center gap-2">
              Supprimer définitivement ?
              <button type="button" disabled={pending} onClick={() => moderate('delete')} className={buttonClass({ variant: 'danger', size: 'sm' })}>
                Supprimer
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                Annuler
              </button>
            </span>
          ) : (
            <button type="button" disabled={pending} onClick={() => setConfirmDelete(true)} className="rounded border border-danger-line px-3 py-1.5 text-danger">
              Supprimer…
            </button>
          ))}
        <button type="button" disabled={pending} onClick={() => moderate('ignore')} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
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
  if (log.data.total === 0) return <p className="text-muted">Aucune décision pour le moment.</p>

  return (
    <div>
      <ul className={`space-y-2 ${log.loading ? 'opacity-50' : ''}`}>
        {log.data.entries.map((entry) => (
          <li key={entry.id} className="card p-3 text-sm">
            <p>
              <span className="font-semibold">{MODERATION_ACTIONS[entry.action]}</span> · {TYPES[entry.targetType]} n°
              {entry.targetId} · {entry.reports} signalement{entry.reports > 1 ? 's' : ''} clos
            </p>
            <p className="text-muted">
              {formatDateTime(entry.createdAt)} par {entry.adminName ?? 'un modérateur supprimé'}
            </p>
            {entry.excerpt && <p className="mt-1 break-words text-ink-soft">« {entry.excerpt} »</p>}
            {entry.note && <p className="mt-1">Note : {entry.note}</p>}
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={Math.ceil(log.data.total / log.data.limit)} onChange={setPage} />
    </div>
  )
}
