import { Link } from 'react-router'
import { GENDERS } from '../labels.js'

// Grille de cartes parfum (2 colonnes sur mobile, 4 sur grand écran)
export default function PerfumeGrid({ perfumes, dimmed = false }) {
  return (
    <ul
      className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${dimmed ? 'opacity-50' : ''}`}
    >
      {perfumes.map((perfume) => (
        <li key={perfume.id}>
          <Link
            to={`/perfumes/${perfume.id}`}
            className="block h-full rounded border border-gray-200 bg-white p-3 hover:border-gray-400"
          >
            <img
              src={perfume.image_url}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="aspect-[3/4] w-full object-contain"
            />
            <p className="mt-2 font-medium leading-tight">{perfume.name}</p>
            <p className="text-sm text-gray-600">{perfume.brand}</p>
            <p className="text-xs text-gray-500">
              {[perfume.year, GENDERS[perfume.gender]].filter(Boolean).join(' · ')}
            </p>
            {typeof perfume.score === 'number' && (
              <p className="mt-1 text-xs font-medium text-gray-700">
                Correspondance {Math.round(perfume.score * 100)} %
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
