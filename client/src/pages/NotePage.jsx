import { Link, useParams, useSearchParams } from 'react-router'
import NoteChip from '../components/NoteChip.jsx'
import Pagination from '../components/Pagination.jsx'
import PerfumeGrid from '../components/PerfumeGrid.jsx'
import { FAMILIES } from '../labels.js'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import { useFetch } from '../useFetch.js'
import { usePageTitle } from '../usePageTitle.js'

const LIMIT = 24

export default function NotePage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page')) || 1

  const { data: note, error, loading, reload } = useFetch(`/api/notes/${id}`)
  const perfumes = useFetch(`/api/notes/${id}/perfumes?page=${page}&limit=${LIMIT}`)
  usePageTitle(note && !loading ? note.name : null)

  if (loading) return <Loading />
  if (error) return <ErrorMessage message={error} onRetry={reload} />

  function goToPage(newPage) {
    setParams({ page: newPage })
    window.scrollTo(0, 0)
  }

  return (
    <div>
      <Link to="/notes" className="text-sm text-gray-600 hover:text-gray-900">
        ← Toutes les notes
      </Link>

      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{note.name}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {note.family ? (
          <Link to={`/notes?famille=${note.family}`} className="underline hover:text-gray-900">
            {FAMILIES[note.family]}
          </Link>
        ) : (
          'Famille non classée'
        )}
        {' · '}
        {note.perfume_count.toLocaleString('fr-FR')} parfum{note.perfume_count > 1 ? 's' : ''}
      </p>

      {note.associated.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold">Souvent associée à</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {note.associated.map((other) => (
              <li key={other.id}>
                <NoteChip note={other} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Parfums avec cette note (les plus populaires d'abord)</h2>
        {perfumes.error && <ErrorMessage message={perfumes.error} onRetry={perfumes.reload} />}
        {perfumes.loading && !perfumes.data && <Loading />}
        {perfumes.data && (
          <>
            <PerfumeGrid perfumes={perfumes.data.results} dimmed={perfumes.loading} />
            <Pagination
              page={page}
              totalPages={Math.ceil(perfumes.data.total / LIMIT)}
              onChange={goToPage}
            />
          </>
        )}
      </section>
    </div>
  )
}
