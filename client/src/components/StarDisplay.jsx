const STAR = 'M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z'

function Stars({ filled }) {
  return [0, 1, 2, 3, 4].map((i) => (
    <svg key={i} viewBox="0 0 20 20" className="size-4 shrink-0">
      <path
        d={STAR}
        fill={filled ? 'var(--star)' : 'none'}
        stroke={filled ? 'var(--star-line)' : 'var(--chart-muted)'}
        strokeWidth="1.2"
      />
    </svg>
  ))
}

// Note en étoiles, en lecture seule (moyennes, avis). value : de 0 à 5, décimales possibles.
// Les étoiles pleines recouvrent les vides sur une largeur proportionnelle à la note.
export default function StarDisplay({ value }) {
  const label = `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} sur 5`
  return (
    <span role="img" aria-label={label} title={label} className="relative inline-flex align-middle">
      <span className="flex">
        <Stars filled={false} />
      </span>
      <span className="absolute inset-y-0 left-0 flex overflow-hidden" style={{ width: `${(value / 5) * 100}%` }}>
        <Stars filled />
      </span>
    </span>
  )
}
