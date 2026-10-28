import { Link, useSearchParams } from 'react-router'
import Pagination from '../components/Pagination.jsx'
import PerfumeGrid from '../components/PerfumeGrid.jsx'
import SortSelect from '../components/SortSelect.jsx'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import SurpriseButton from '../components/SurpriseButton.jsx'
import { getRecentPerfumes } from '../history.js'
import { buttonClass, chipClass, inputClass } from '../ui/styles.js'
import { useFetch } from '../useFetch.js'
import { usePageTitle } from '../usePageTitle.js'

const LIMIT = 24
const surpriseClass = `${chipClass(false)} disabled:opacity-60`

export default function SearchPage() {
  // La recherche et la page sont gardées dans l'URL (partageable, bouton retour)
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = Number(params.get('page')) || 1
  const byRating = params.get('tri') === 'note'

  const query = new URLSearchParams({ q, page, limit: LIMIT, sort: byRating ? 'rating' : 'name' })
  const { data, error, loading, reload } = useFetch(`/api/perfumes?${query}`)
  const hasHistory = getRecentPerfumes().length > 0
  usePageTitle(q ? `Recherche « ${q} »` : null)

  // Paramètres de l'URL : recherche (q), tri (tri=note) et page ; les valeurs vides sont omises
  function update(changes) {
    const next = { q, tri: byRating ? 'note' : '', page, ...changes }
    setParams(Object.fromEntries(Object.entries(next).filter(([key, value]) => value && !(key === 'page' && value === 1))))
  }

  function handleSubmit(event) {
    event.preventDefault()
    update({ q: new FormData(event.currentTarget).get('q').trim(), page: 1 })
  }

  function goToPage(newPage) {
    update({ page: newPage })
    window.scrollTo(0, 0)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Rechercher un parfum</h1>
      <p className="mt-1 mb-4 text-sm text-muted">
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
          className={inputClass({ className: 'min-w-0 flex-1' })}
        />
        <button type="submit" className={buttonClass()}>
          Rechercher
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Pas d'idée ?</span>
        <Link to="/questionnaire" className={surpriseClass}>
          Faire le questionnaire
        </Link>
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
          <div className="mt-4 mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              {data.total.toLocaleString('fr-FR')} parfum{data.total > 1 ? 's' : ''}
              {q && <> pour « {q} »</>}
              {byRating && ' (ayant au moins 100 votes)'}
            </p>
            <SortSelect
              value={byRating ? 'note' : 'nom'}
              options={[
                { value: 'nom', label: 'Nom' },
                { value: 'note', label: 'Les mieux notés' },
              ]}
              onChange={(value) => update({ tri: value === 'note' ? 'note' : '', page: 1 })}
            />
          </div>
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
