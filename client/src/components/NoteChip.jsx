import { Link } from 'react-router'

// Lien vers la page d'une note, avec le nombre de parfums si fourni
export default function NoteChip({ note, count }) {
  return (
    <Link
      to={`/notes/${note.id}`}
      className="inline-block rounded-full border border-gray-300 bg-white px-3 py-1 text-sm hover:border-gray-500"
    >
      {note.name}
      {count != null && <span className="ml-1 text-gray-500">{count.toLocaleString('fr-FR')}</span>}
    </Link>
  )
}
