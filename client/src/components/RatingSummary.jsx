const formatRating = (value) => value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const formatCount = (value) => value.toLocaleString('fr-FR', { notation: 'compact' }) // 33 428 → « 33 k »

// Notes compactes d'un parfum (cartes, aperçu de la carte) : Fragrantica et, s'il y en a, avis des membres.
// perfume : { ratingAvg, ratingCount, communityAvg, communityCount }
export default function RatingSummary({ perfume, className = '' }) {
  if (perfume.ratingAvg == null && !perfume.communityCount) return null

  return (
    <p className={`flex flex-wrap items-center gap-x-2 text-xs text-gray-700 ${className}`}>
      {perfume.ratingAvg != null && (
        <span>
          <span aria-hidden="true" className="text-[#b07a00]">
            ★{' '}
          </span>
          <span className="sr-only">Note Fragrantica :</span>
          <span className="font-medium">{formatRating(perfume.ratingAvg)}</span>
          <span className="sr-only"> sur 5</span>
          <span className="text-gray-600"> · {formatCount(perfume.ratingCount)} votes</span>
        </span>
      )}
      {perfume.communityCount > 0 && (
        <span>
          Membres : <span className="font-medium">{formatRating(perfume.communityAvg)}</span>
          <span className="sr-only"> sur 5</span> ({perfume.communityCount} avis)
        </span>
      )}
    </p>
  )
}
