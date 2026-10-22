// Champ de formulaire étiqueté, avec aide et message d'erreur reliés au champ
export default function TextField({ label, name, error, hint, ...inputProps }) {
  const hintId = hint ? `${name}-aide` : undefined
  const errorId = error ? `${name}-erreur` : undefined

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        className={`mt-1 w-full rounded border bg-white px-3 py-2 ${error ? 'border-red-600' : 'border-gray-300'}`}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-gray-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
