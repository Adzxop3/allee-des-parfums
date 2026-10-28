// Note de 1 à 5 étoiles. Ce sont de vrais boutons radio (masqués) : utilisable au clavier
// avec les flèches et annoncé correctement par les lecteurs d'écran.
// value : 1 à 5 ou null ; onChange(nouvelle valeur ou null)
export default function StarRating({ name, value, onChange, disabled = false, legend = 'Ma note' }) {
  return (
    <fieldset disabled={disabled} className="flex flex-wrap items-center gap-x-2 disabled:opacity-60">
      <legend className="sr-only">{legend}</legend>
      <span aria-hidden="true" className="text-sm text-muted">
        {legend} :
      </span>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            className="cursor-pointer rounded p-0.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink"
          >
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="sr-only"
            />
            <span className="sr-only">
              {star} étoile{star > 1 ? 's' : ''}
            </span>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-6">
              <path
                d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
                fill={value && star <= value ? 'var(--star)' : 'none'}
                stroke={value && star <= value ? 'var(--star-line)' : 'var(--chart-muted)'}
                strokeWidth="1.2"
              />
            </svg>
          </label>
        ))}
      </div>
      {value && (
        <button type="button" onClick={() => onChange(null)} className="text-xs text-muted link">
          Effacer
        </button>
      )}
    </fieldset>
  )
}
