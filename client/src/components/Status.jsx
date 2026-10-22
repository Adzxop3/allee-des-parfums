// États communs à toutes les pages : chargement et erreur (avec bouton pour réessayer)

export function Loading({ label = 'Chargement…' }) {
  return (
    <p role="status" className="flex items-center gap-2 text-gray-600">
      <span
        aria-hidden="true"
        className="inline-block size-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 motion-reduce:animate-none"
      />
      {label}
    </p>
  )
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-red-800">
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-red-300 bg-white px-2 py-0.5 text-sm hover:border-red-500"
        >
          Réessayer
        </button>
      )}
    </div>
  )
}
