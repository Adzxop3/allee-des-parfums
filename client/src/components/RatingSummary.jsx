import RatingBadge from '../ui/RatingBadge.jsx'

const formatCount = (value) => value.toLocaleString('fr-FR', { notation: 'compact' }) // 33 428 → « 33 k »

// Notes compactes d'un parfum (cartes, aperçu de la carte) : Fragrantica et, s'il y en a, avis des membres.
// perfume : { ratingAvg, ratingCount, communityAvg, communityCount }
export default function RatingSummary({ perfume, className = '' }) {
  if (perfume.ratingAvg == null && !perfume.communityCount) return null

  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${className}`}>
      {perfume.ratingAvg != null && (
        <RatingBadge value={perfume.ratingAvg} source="Note Fragrantica" detail={`${formatCount(perfume.ratingCount)} votes`} />
      )}
      {perfume.communityCount > 0 && (
        <RatingBadge
          value={perfume.communityAvg}
          source="Note des membres"
          detail={`membres (${perfume.communityCount} avis)`}
        />
      )}
    </p>
  )
}
