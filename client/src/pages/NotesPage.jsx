import { useSearchParams } from 'react-router'
import FilterChips from '../components/FilterChips.jsx'
import NoteChip from '../components/NoteChip.jsx'
import { FAMILIES } from '../labels.js'
import { useFetch } from '../useFetch.js'

const FAMILY_OPTIONS = [
  { value: '', label: 'Toutes' },
  ...Object.entries(FAMILIES).map(([value, label]) => ({ value, label })),
  { value: 'none', label: 'Non classées' },
]

export default function NotesPage() {
  // La famille choisie est gardée dans l'URL (?famille=citrus)
  const [params, setParams] = useSearchParams()
  const family = params.get('famille') ?? ''
  const { data: notes, error, loading } = useFetch(`/api/notes?family=${family}`)

  return (
    <div>
      <h1 className="text-2xl font-bold">Notes</h1>
      <p className="mt-1 text-sm text-gray-600">
        Les notes sont triées par nombre de parfums qui les utilisent.
      </p>

      <div className="mt-4">
        <FilterChips
          label="Famille olfactive"
          options={FAMILY_OPTIONS}
          value={family}
          onChange={(value) => setParams(value ? { famille: value } : {})}
        />
      </div>

      {family === 'none' && (
        <p className="mt-2 text-sm text-gray-600">
          Notes trop rares (moins de 10 parfums) pour que leur famille soit déduite.
        </p>
      )}

      {error && <p className="mt-6 text-red-600">{error}</p>}
      {loading && !notes && <p className="mt-6 text-gray-600">Chargement…</p>}

      {notes && (
        <>
          <p className="mt-4 text-sm text-gray-600">
            {notes.length.toLocaleString('fr-FR')} note{notes.length > 1 ? 's' : ''}
          </p>
          <ul className={`mt-3 flex flex-wrap gap-2 ${loading ? 'opacity-50' : ''}`}>
            {notes.map((note) => (
              <li key={note.id}>
                <NoteChip note={note} count={note.perfume_count} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
