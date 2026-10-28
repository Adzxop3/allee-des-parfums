import { Link } from 'react-router'
import { chipClass } from '../ui/styles.js'

// Lien vers la page d'une note, avec le nombre de parfums si fourni
export default function NoteChip({ note, count }) {
  return (
    <Link
      to={`/notes/${note.id}`}
      className={`${chipClass(false)} inline-block`}
    >
      {note.name}
      {count != null && <span className="ml-1 text-muted">{count.toLocaleString('fr-FR')}</span>}
    </Link>
  )
}
