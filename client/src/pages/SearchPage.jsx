import { useSearchParams } from 'react-router'
import Pagination from '../components/Pagination.jsx'
import PerfumeGrid from '../components/PerfumeGrid.jsx'
import SurpriseButton from '../components/SurpriseButton.jsx'
import { getRecentPerfumes } from '../history.js'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import { useFetch } from '../useFetch.js'
import { usePageTitle } from '../usePageTitle.js'

const LIMIT = 24
const surpriseClass =
  'rounded-full border border-gray-300 bg-white px-3 py-1 hover:border-gray-500 disabled:opacity-60'

export default function SearchPage() {
  // La recherche et la page sont gardées dans l'URL (partageable, bouton retour)
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = Number(params.get('page')) || 1

  const query = new URLSearchParams({ q, page, limit: LIMIT })
  const { data, error, loading, reload } = useFetch(`/api/perfumes?${query}`)
  const hasHistory = getRecentPerfumes().length > 0
  usePageTitle(q ? `Recherche « ${q} »` : null)

  function handleSubmit(event) {
    event.preventDefault()
    const value = new FormData(event.currentTarget).get('q').trim()
    setParams(value ? { q: value } : {})
  }

  function goToPage(newPage) {
    setParams(q ? { q, page: newPage } : { page: newPage })
    window.scrollTo(0, 0)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Rechercher un parfum</h1>
      <p className="mt-1 mb-4 text-sm text-gray-600">
        Explorez 140 000 parfums par nom ou par marque, ou parcourez-les par notes, ambiances et
        sur la carte olfactive.
      </p>

      <form onSubmit={handleSubmit} role="search" className="flex gap-2">
        <label htmlFor="recherche" className="sr-only">
          Nom de parfum ou de marque
        </label>
        <input
          id="recherche"
          key={q}
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Nom de parfum ou de marque"
          className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-3 py-2"
        />
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
          Rechercher
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-600">Pas d'idée ?</span>
        <SurpriseButton similar={false} className={surpriseClass}>
          Un parfum au hasard
        </SurpriseButton>
        {hasHistory && (
          <SurpriseButton className={surpriseClass}>Un parfum proche de mes dernières visites</SurpriseButton>
        )}
      </div>

      {error && (
        <div className="mt-6">
          <ErrorMessage message={error} onRetry={reload} />
        </div>
      )}

      {data && (
        <>
          <p className="mt-4 mb-4 text-sm text-gray-600">
            {data.total.toLocaleString('fr-FR')} parfum{data.total > 1 ? 's' : ''}
            {q && <> pour « {q} »</>}
          </p>
          <PerfumeGrid perfumes={data.results} dimmed={loading} />
          <Pagination
            page={page}
            totalPages={Math.ceil(data.total / LIMIT)}
            onChange={goToPage}
          />
        </>
      )}

      {loading && !data && (
        <div className="mt-6">
          <Loading />
        </div>
      )}
    </div>
  )
}
