import { useSearchParams } from 'react-router'
import FilterChips from '../components/FilterChips.jsx'
import Pagination from '../components/Pagination.jsx'
import PerfumeGrid from '../components/PerfumeGrid.jsx'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import { MOOD_DESCRIPTIONS, MOODS } from '../labels.js'
import { useFetch } from '../useFetch.js'
import { usePageTitle } from '../usePageTitle.js'

const LIMIT = 24

// Paramètre de l'URL de la page -> paramètre de l'API, avec les valeurs possibles
const FILTERS = [
  { param: 'saison', api: 'season', label: 'Saison', all: 'Toutes', values: ['winter', 'spring', 'summer', 'autumn'] },
  { param: 'moment', api: 'occasion', label: 'Moment', all: 'Tous', values: ['day', 'night'] },
  {
    param: 'humeur',
    api: 'mood',
    label: 'Humeur',
    all: 'Toutes',
    values: ['energizing', 'sensual', 'cozy', 'romantic', 'elegant', 'mysterious', 'joyful', 'natural'],
  },
]

export default function AmbiancesPage() {
  // Les choix sont gardés dans l'URL (?saison=winter&humeur=cozy&page=2)
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page')) || 1
  const mood = params.get('humeur')

  const wellRated = params.get('bienNotes') === '1'
  const query = new URLSearchParams({ page, limit: LIMIT })
  if (wellRated) query.set('minRating', 4)
  for (const filter of FILTERS) {
    const value = params.get(filter.param)
    if (value) query.set(filter.api, value)
  }
  const hasFilter = FILTERS.some((filter) => params.get(filter.param))
  const { data, error, loading, reload } = useFetch(`/api/moods/perfumes?${query}`)
  usePageTitle('Ambiances')

  // Changer un filtre ramène à la première page
  function select(param, value) {
    const next = new URLSearchParams(params)
    next.delete('page')
    if (value) next.set(param, value)
    else next.delete(param)
    setParams(next)
  }

  function goToPage(newPage) {
    const next = new URLSearchParams(params)
    next.set('page', newPage)
    setParams(next)
    window.scrollTo(0, 0)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Ambiances</h1>
      <p className="mt-1 text-sm text-muted">
        Saisons et moments viennent des votes de la communauté Fragrantica ; les humeurs sont
        déduites des accords de chaque parfum.
      </p>

      <div className="mt-4 space-y-3">
        {FILTERS.map((filter) => (
          <div key={filter.param}>
            <h2 className="mb-1 text-sm font-semibold">{filter.label}</h2>
            <FilterChips
              label={filter.label}
              options={[
                { value: '', label: filter.all },
                ...filter.values.map((value) => ({ value, label: MOODS[value] })),
              ]}
              value={params.get(filter.param) ?? ''}
              onChange={(value) => select(filter.param, value)}
            />
          </div>
        ))}
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={wellRated}
          onChange={(event) => select('bienNotes', event.target.checked ? '1' : '')}
          className="accent-accent"
        />
        Seulement les parfums bien notés (4/5 et plus, votes Fragrantica et avis des membres)
      </label>

      {mood && MOOD_DESCRIPTIONS[mood] && (
        <p className="mt-3 text-sm text-ink-soft">
          <span className="font-medium">{MOODS[mood]}</span> : {MOOD_DESCRIPTIONS[mood]}
        </p>
      )}

      <div className="mt-6">
        {error && <ErrorMessage message={error} onRetry={reload} />}
        {loading && !data && <Loading />}
      </div>

      {data && (
        <>
          <p className="mt-4 mb-4 text-sm text-muted">
            {data.total.toLocaleString('fr-FR')} parfum{data.total > 1 ? 's' : ''} (ayant au moins
            100 votes), {hasFilter ? 'les plus correspondants d’abord' : 'les plus populaires d’abord'}
          </p>
          <PerfumeGrid perfumes={data.results} dimmed={loading} />
          <Pagination page={page} totalPages={Math.ceil(data.total / LIMIT)} onChange={goToPage} />
        </>
      )}
    </div>
  )
}
