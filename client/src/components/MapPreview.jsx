import { Link } from 'react-router'
import { ACCORDS } from '../labels.js'
import { useFetch } from '../useFetch.js'

// Aperçu du parfum choisi sur la carte : panneau en bas de l'écran sur mobile,
// carte en haut à droite de la carte olfactive sur grand écran
export default function MapPreview({ perfumeId, group, onClose }) {
  const { data: perfume, error, loading } = useFetch(`/api/perfumes/${perfumeId}`)

  return (
    <aside
      aria-label="Aperçu du parfum"
      className="fixed inset-x-0 bottom-0 z-20 rounded-t-xl border border-gray-200 bg-white p-4 shadow-lg md:absolute md:inset-x-auto md:top-3 md:right-3 md:bottom-auto md:w-80 md:rounded-xl"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer l'aperçu"
        className="absolute top-2 right-2 rounded px-2 text-xl leading-none text-gray-500 hover:text-gray-900"
      >
        ×
      </button>

      {loading && <p className="text-sm text-gray-600">Chargement…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {perfume && !loading && (
        <div className="flex gap-3">
          <img
            src={perfume.image_url}
            alt=""
            referrerPolicy="no-referrer"
            className="h-24 w-18 shrink-0 object-contain"
          />
          <div className="min-w-0 pr-6">
            <p className="font-semibold leading-tight">{perfume.name}</p>
            <p className="text-sm text-gray-600">
              {[perfume.brand, perfume.year].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
              <span className="inline-block size-2.5 rounded-full" style={{ background: group.color }} />
              {group.label}
            </p>
            {perfume.accords.length > 0 && (
              <p className="mt-1 text-xs text-gray-600">
                {perfume.accords
                  .slice(0, 3)
                  .map((a) => ACCORDS[a.name] ?? a.name)
                  .join(', ')}
              </p>
            )}
            <Link
              to={`/perfumes/${perfume.id}`}
              className="mt-2 inline-block text-sm font-medium underline underline-offset-2"
            >
              Voir la fiche →
            </Link>
          </div>
        </div>
      )}
    </aside>
  )
}
