import { Link, useSearchParams } from 'react-router'
import { GENDERS } from '../labels.js'
import { useFetch } from '../useFetch.js'

const LIMIT = 24

export default function SearchPage() {
  // La recherche et la page sont gardées dans l'URL (partageable, bouton retour)
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = Number(params.get('page')) || 1

  const query = new URLSearchParams({ q, page, limit: LIMIT })
  const { data, error, loading } = useFetch(`/api/perfumes?${query}`)
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1

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
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
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

      {error && <p className="mt-6 text-red-600">{error}</p>}

      {data && (
        <>
          <p className="mt-4 text-sm text-gray-600">
            {data.total.toLocaleString('fr-FR')} parfum{data.total > 1 ? 's' : ''}
            {q && <> pour « {q} »</>}
          </p>

          <ul
            className={`mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${loading ? 'opacity-50' : ''}`}
          >
            {data.results.map((perfume) => (
              <li key={perfume.id}>
                <Link
                  to={`/perfumes/${perfume.id}`}
                  className="block h-full rounded border border-gray-200 bg-white p-3 hover:border-gray-400"
                >
                  <img
                    src={perfume.image_url}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="aspect-[3/4] w-full object-contain"
                  />
                  <p className="mt-2 font-medium leading-tight">{perfume.name}</p>
                  <p className="text-sm text-gray-600">{perfume.brand}</p>
                  <p className="text-xs text-gray-500">
                    {[perfume.year, GENDERS[perfume.gender]].filter(Boolean).join(' · ')}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {data.total > LIMIT && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                className="rounded border border-gray-300 bg-white px-3 py-1 disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-sm">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
                className="rounded border border-gray-300 bg-white px-3 py-1 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}

      {loading && !data && <p className="mt-6 text-gray-600">Chargement…</p>}
    </div>
  )
}
