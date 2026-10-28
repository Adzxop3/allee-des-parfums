import { inputClass } from '../ui/styles.js'

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
        className={inputClass({ error: Boolean(error), className: 'mt-1 w-full' })}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
