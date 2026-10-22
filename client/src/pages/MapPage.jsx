import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import FilterChips from '../components/FilterChips.jsx'
import MapPreview from '../components/MapPreview.jsx'
import OlfactoryMap from '../components/OlfactoryMap.jsx'
import { MAP_GROUPS, mapGroupOf } from '../mapGroups.js'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import { useFetch } from '../useFetch.js'
import { usePageTitle } from '../usePageTitle.js'

// Nombre de parfums affichés : les plus populaires par défaut, pour rester fluide
const COUNTS = [
  { value: '2000', label: '2 000' },
  { value: '5000', label: '5 000' },
  { value: '10000', label: '10 000' },
  { value: 'all', label: 'Tous' },
]

export default function MapPage() {
  const [params, setParams] = useSearchParams()
  const count = params.get('nombre') ?? '5000'
  const { data, error, loading, reload } = useFetch(`/api/map?limit=${count === 'all' ? 1000000 : count}`)
  usePageTitle('Carte olfactive')

  const [highlight, setHighlight] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const points = useMemo(
    () => (data?.points ?? []).map(([id, x, y, family]) => ({ id, x, y, group: mapGroupOf(family) })),
    [data],
  )
  const selected = points.find((p) => p.id === selectedId)

  return (
    <div>
      <h1 className="text-2xl font-bold">Carte olfactive</h1>
      <p className="mt-1 text-sm text-gray-600">
        Chaque point est un parfum ; deux parfums proches ont des accords et des notes semblables.
        Zoomez, déplacez-vous et touchez un point pour le découvrir.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <h2 className="mb-1 text-sm font-semibold">Parfums affichés (les plus populaires)</h2>
          <FilterChips
            label="Nombre de parfums affichés"
            options={COUNTS.map((c) =>
              c.value === 'all' && data ? { ...c, label: `Tous (${data.total.toLocaleString('fr-FR')})` } : c,
            )}
            value={count}
            onChange={(value) => setParams(value === '5000' ? {} : { nombre: value })}
          />
        </div>

        <div>
          <h2 className="mb-1 text-sm font-semibold">Familles (touchez pour isoler)</h2>
          <div
            role="group"
            aria-label="Familles"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {MAP_GROUPS.map((group) => {
              const selectedGroup = highlight === group.key
              return (
                <button
                  key={group.key}
                  type="button"
                  aria-pressed={selectedGroup}
                  onClick={() => setHighlight(selectedGroup ? '' : group.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                    selectedGroup ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white'
                  }`}
                >
                  <span className="inline-block size-2.5 rounded-full" style={{ background: group.color }} />
                  {group.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} onRetry={reload} />
        </div>
      )}

      <div className="relative mt-3 h-[65vh] min-h-[360px] overflow-hidden rounded border border-gray-200 bg-white">
        {loading && (
          <div className="absolute top-3 left-3 z-10 rounded bg-white/90 px-2 py-1 text-sm">
            <Loading label="Chargement de la carte…" />
          </div>
        )}
        <OlfactoryMap
          points={points}
          highlight={highlight}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        {selected && (
          <MapPreview
            key={selected.id}
            perfumeId={selected.id}
            group={selected.group}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  )
}
