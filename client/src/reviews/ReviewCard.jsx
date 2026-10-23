import { Link } from 'react-router'
import StarDisplay from '../components/StarDisplay.jsx'

const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', { dateStyle: 'long' })

// Un avis. Le texte des membres est affiché tel quel, en texte brut (React l'échappe : aucun HTML possible).
// perfume (facultatif) : le parfum concerné, affiché en tête (sur le profil d'un membre)
export default function ReviewCard({ review, perfume, children }) {
  const edited = new Date(review.updatedAt) - new Date(review.createdAt) > 60 * 1000

  return (
    <article className="rounded border border-gray-200 bg-white p-4">
      {perfume && (
        <Link to={`/perfumes/${perfume.id}`} className="mb-3 flex items-center gap-3 hover:underline">
          <img src={perfume.image_url} alt="" referrerPolicy="no-referrer" className="h-12 w-9 object-contain" />
          <span>
            <span className="font-medium">{perfume.name}</span>
            {perfume.brand && <span className="text-sm text-gray-600"> · {perfume.brand}</span>}
          </span>
        </Link>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StarDisplay value={review.rating} />
        <h3 className="font-semibold">{review.title}</h3>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Par{' '}
        <Link to={`/membres/${review.author.id}`} className="underline underline-offset-2 hover:text-gray-900">
          {review.author.displayName}
        </Link>
        , le {formatDate(review.createdAt)}
        {edited && ` (modifié le ${formatDate(review.updatedAt)})`}
      </p>
      <p className="mt-3 whitespace-pre-line break-words">{review.body}</p>
      {children}
    </article>
  )
}
