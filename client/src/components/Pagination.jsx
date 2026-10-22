// Boutons Précédent / Suivant ; n'affiche rien s'il n'y a qu'une page
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const buttonClass = 'rounded border border-gray-300 bg-white px-3 py-1 disabled:opacity-40'
  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={buttonClass}
      >
        Précédent
      </button>
      <span className="text-sm">
        Page {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className={buttonClass}
      >
        Suivant
      </button>
    </div>
  )
}
