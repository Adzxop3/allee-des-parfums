import { useState } from 'react'
import { chipClass, inputClass } from '../ui/styles.js'

// Choix de notes : recherche avec suggestions, notes choisies affichées en chips retirables.
// notes : toutes les notes disponibles [{ id, name }] ; value : ids choisis ; excluded : ids interdits
// (déjà choisis dans l'autre question : une note ne peut pas être à la fois aimée et évitée)
export default function NotePicker({ id, notes, value, onChange, max, excluded = [] }) {
  const [search, setSearch] = useState('')
  const byId = new Map(notes.map((note) => [note.id, note]))
  const words = search.trim().toLowerCase()
  const suggestions = words
    ? notes
        .filter((note) => !value.includes(note.id) && !excluded.includes(note.id))
        .filter((note) => note.name.toLowerCase().includes(words))
        .slice(0, 8)
    : []
  const full = value.length >= max

  function add(noteId) {
    onChange([...value, noteId])
    setSearch('')
  }

  return (
    <div>
      {value.length > 0 && (
        <ul aria-label="Notes choisies" className="mb-3 flex flex-wrap gap-2">
          {value.map((noteId) => {
            const name = byId.get(noteId)?.name ?? `Note ${noteId}`
            return (
              <li key={noteId}>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== noteId))}
                  aria-label={`Retirer ${name}`}
                  className={`${chipClass(true)} flex items-center gap-1`}
                >
                  {name} <span aria-hidden="true">×</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <label htmlFor={id} className="block text-sm font-medium">
        Rechercher une note
      </label>
      <input
        id={id}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        disabled={full}
        placeholder={full ? `${max} notes au maximum` : 'Ex. : Vanilla, Rose, Vetiver…'}
        autoComplete="off"
        className={inputClass({ className: 'mt-1 w-full' })}
      />

      {words && !full && (
        <ul aria-label="Suggestions" className="mt-2 flex flex-wrap gap-2">
          {suggestions.length === 0 && <li className="text-sm text-muted">Aucune note trouvée.</li>}
          {suggestions.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => add(note.id)}
                className={chipClass(false)}
              >
                + {note.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
