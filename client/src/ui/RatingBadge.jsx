const formatRating = (value) => value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// Badge de note compact : « ★ 4,1 » puis le détail (nombre de votes, source).
// source : texte lu par les lecteurs d'écran avant la note (ex. « Note Fragrantica »)
export default function RatingBadge({ value, source, detail, className = '' }) {
  return (
    <span className={`inline-flex items-baseline gap-1 ${className}`}>
      <span className="inline-flex items-baseline gap-0.5 rounded bg-surface-2 px-1.5 py-0.5 font-semibold text-ink">
        <span aria-hidden="true" className="text-star">
          ★
        </span>
        <span className="sr-only">{source} :</span>
        {formatRating(value)}
        <span className="sr-only"> sur 5</span>
      </span>
      {detail && <span className="text-muted">{detail}</span>}
    </span>
  )
}
