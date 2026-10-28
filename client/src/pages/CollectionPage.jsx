import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import BarList from '../charts/BarList.jsx'
import { ChartCard, DataTable } from '../charts/chartKit.jsx'
import CollectionItem from '../components/CollectionItem.jsx'
import PerfumeGrid from '../components/PerfumeGrid.jsx'
import RequireVerifiedEmail from '../components/RequireVerifiedEmail.jsx'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import Tabs from '../components/Tabs.jsx'
import { ACCORDS, COLLECTION_STATUSES } from '../labels.js'
import { inputClass } from '../ui/styles.js'
import { useFetch } from '../useFetch.js'
import { usePageTitle } from '../usePageTitle.js'

const STATUSES = Object.keys(COLLECTION_STATUSES)

const SORTS = {
  recent: { label: 'Ajout le plus récent', compare: (a, b) => b.addedAt.localeCompare(a.addedAt) },
  rating: { label: 'Ma note', compare: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) },
  name: { label: 'Nom', compare: (a, b) => a.name.localeCompare(b.name, 'fr') },
  year: { label: 'Année (récents d’abord)', compare: (a, b) => (b.year ?? 0) - (a.year ?? 0) },
}

export default function CollectionPage() {
  usePageTitle('Ma parfumothèque')
  return (
    <div>
      <h1 className="text-2xl font-bold">Ma parfumothèque</h1>
      <div className="mt-4">
        <RequireVerifiedEmail feature="accéder à votre parfumothèque">
          <Collection />
        </RequireVerifiedEmail>
      </div>
    </div>
  )
}

function Collection() {
  // Onglet et tri gardés dans l'URL (?statut=wishlist&tri=name)
  const [params, setParams] = useSearchParams()
  const tab = STATUSES.includes(params.get('statut')) ? params.get('statut') : 'owned'
  const sort = SORTS[params.get('tri')] ? params.get('tri') : 'recent'
  const [search, setSearch] = useState('')

  const list = useFetch('/api/collection')
  const summary = useFetch(`/api/collection/summary?status=${tab}`)
  const suggestions = useFetch('/api/collection/recommendations')
  // Après une modification (statut, note, retrait), tout ce qui dépend de la collection est rechargé
  const refresh = () => {
    list.reload()
    summary.reload()
    suggestions.reload()
  }

  function setParam(key, value) {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
  }

  if (list.error) return <ErrorMessage message={list.error} onRetry={list.reload} />
  if (!list.data) return <Loading />

  const words = search.trim().toLowerCase()
  const items = list.data.items
    .filter((item) => item.status === tab)
    .filter((item) => !words || `${item.name} ${item.brand ?? ''}`.toLowerCase().includes(words))
    .sort(SORTS[sort].compare)
  const tabTotal = list.data.counts[tab]

  return (
    <div>
      <Tabs
        tabs={STATUSES.map((status) => ({
          key: status,
          label: `${COLLECTION_STATUSES[status].tab} (${list.data.counts[status]})`,
        }))}
        value={tab}
        onChange={(status) => setParam('statut', status)}
        label="Statut des parfums"
        panelId="panneau-collection"
      />

      <div role="tabpanel" id="panneau-collection" aria-labelledby={`onglet-${tab}`} className="mt-4">
        {tabTotal === 0 ? (
          <p className="text-muted">
            Aucun parfum ici pour l'instant. Ajoutez-en depuis la fiche d'un parfum, par exemple en{' '}
            <Link to="/" className="link">
              recherchant un parfum
            </Link>
            .
          </p>
        ) : (
          <>
            {/* Une synthèse n'a de sens qu'à partir de quelques parfums */}
            {tabTotal >= 2 ? (
              <CollectionSummary state={summary} tabLabel={COLLECTION_STATUSES[tab].tab} />
            ) : (
              <p className="text-sm text-muted">
                Ajoutez au moins 2 parfums ici pour voir les notes et accords qui reviennent le plus.
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-end gap-3">
              <label className="min-w-0 flex-1 text-sm">
                <span className="block font-medium">Filtrer</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nom ou marque"
                  className={inputClass({ className: 'mt-1 w-full' })}
                />
              </label>
              <label className="text-sm">
                <span className="block font-medium">Trier par</span>
                <select
                  value={sort}
                  onChange={(event) => setParam('tri', event.target.value)}
                  className={inputClass({ size: 'sm', className: 'mt-1' })}
                >
                  {Object.entries(SORTS).map(([key, option]) => (
                    <option key={key} value={key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mt-3 text-sm text-muted" role="status">
              {items.length} parfum{items.length > 1 ? 's' : ''}
              {words && ` sur ${tabTotal}`}
            </p>
            <ul className={`mt-2 grid gap-3 md:grid-cols-2 ${list.loading ? 'opacity-50' : ''}`}>
              {items.map((item) => (
                <CollectionItem key={item.id} item={item} onChanged={refresh} />
              ))}
            </ul>
          </>
        )}
      </div>

      <Suggestions state={suggestions} />
    </div>
  )
}

// Parfums proches de ceux que l'utilisateur a notés 4 ou 5 étoiles (tous onglets confondus)
function Suggestions({ state }) {
  return (
    <section aria-labelledby="suggestions-titre" className="mt-10 border-t border-line pt-6">
      <h2 id="suggestions-titre" className="text-xl font-semibold">
        Parfums qui pourraient vous plaire
      </h2>
      <p className="mt-1 text-sm text-muted">
        D'après les parfums de votre collection notés 4 ou 5 étoiles : ceux qui leur ressemblent le plus par
        leurs accords et leurs notes.
      </p>
      <div className="mt-4">
        {state.error && <ErrorMessage message={state.error} onRetry={state.reload} />}
        {state.loading && !state.data && <Loading />}
        {state.data && state.data.basedOn === 0 && (
          <p className="text-muted">
            Donnez 4 ou 5 étoiles à des parfums de votre collection (onglets « Mes parfums » ou « Testés ») pour
            recevoir des suggestions.
          </p>
        )}
        {state.data && state.data.results.length > 0 && (
          <PerfumeGrid perfumes={state.data.results} dimmed={state.loading} />
        )}
      </div>
    </section>
  )
}

// Notes et accords les plus présents dans l'onglet affiché (mêmes barres que la page « En chiffres »)
function CollectionSummary({ state, tabLabel }) {
  const data = state.data
  const count = (n) => `${n} parfum${n > 1 ? 's' : ''}`

  return (
    <div className={`grid gap-4 md:grid-cols-2 ${state.loading ? 'opacity-50' : ''}`}>
      <ChartCard
        title="Les notes qui reviennent"
        subtitle={`Nombre de parfums de « ${tabLabel} » qui contiennent chaque note.`}
        state={state}
        table={
          data && (
            <DataTable
              columns={[{ label: 'Note' }, { label: 'Parfums', align: 'right' }]}
              rows={data.notes.map((n) => [n.name, n.count])}
            />
          )
        }
      >
        {data && (
          <BarList
            items={data.notes.map((n) => ({ key: n.id, label: n.name, value: n.count, href: `/notes/${n.id}` }))}
            formatValue={String}
          />
        )}
      </ChartCard>
      <ChartCard
        title="Les accords qui dominent"
        subtitle={`Accords les plus intenses dans « ${tabLabel} », avec le nombre de parfums concernés.`}
        state={state}
        table={
          data && (
            <DataTable
              columns={[{ label: 'Accord' }, { label: 'Parfums', align: 'right' }]}
              rows={data.accords.map((a) => [ACCORDS[a.name] ?? a.name, count(a.count)])}
            />
          )
        }
      >
        {data && (
          <BarList
            items={data.accords.map((a) => ({ key: a.name, label: ACCORDS[a.name] ?? a.name, value: a.count }))}
            formatValue={String}
          />
        )}
      </ChartCard>
    </div>
  )
}
