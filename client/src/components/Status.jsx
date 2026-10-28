// États communs à toutes les pages : chargement et erreur (avec bouton pour réessayer)

export function Loading({ label = 'Chargement…' }) {
  return (
    <p role="status" className="flex items-center gap-2 text-muted">
      <span
        aria-hidden="true"
        className="inline-block size-4 animate-spin rounded-full border-2 border-field border-t-ink-soft motion-reduce:animate-none"
      />
      {label}
    </p>
  )
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded border border-danger-line bg-danger-bg px-3 py-2 text-danger">
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-danger-line bg-surface px-2 py-0.5 text-sm hover:border-danger"
        >
          Réessayer
        </button>
      )}
    </div>
  )
}
