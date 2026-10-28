import { Link } from 'react-router'
import { GENDERS } from '../labels.js'
import PerfumeImage from './PerfumeImage.jsx'
import RatingSummary from './RatingSummary.jsx'

// Grille de cartes parfum (2 colonnes sur mobile, 4 sur grand écran)
export default function PerfumeGrid({ perfumes, dimmed = false }) {
  return (
    <ul
      className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${dimmed ? 'opacity-50' : ''}`}
    >
      {perfumes.map((perfume, index) => (
        <li key={perfume.id}>
          <Link
            to={`/perfumes/${perfume.id}`}
            className="block h-full card p-3 hover:border-field"
          >
            {/* Les 4 premières cartes sont visibles dès l'arrivée (2 rangées sur mobile) */}
            <PerfumeImage src={perfume.image_url} priority={index < 4} className="aspect-[3/4] h-auto w-full object-contain" />
            <p className="mt-2 font-medium leading-tight">{perfume.name}</p>
            <p className="text-sm text-muted">{perfume.brand}</p>
            <p className="text-xs text-muted">
              {[perfume.year, GENDERS[perfume.gender]].filter(Boolean).join(' · ')}
            </p>
            <RatingSummary perfume={perfume} className="mt-1" />
            {typeof perfume.score === 'number' && (
              <p className="mt-1 text-xs font-medium text-ink-soft">
                Correspondance {Math.round(perfume.score * 100)} %
              </p>
            )}
            {perfume.explanation && <p className="mt-1 text-xs text-muted">{perfume.explanation}</p>}
          </Link>
        </li>
      ))}
    </ul>
  )
}
