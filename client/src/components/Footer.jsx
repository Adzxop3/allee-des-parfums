import { Link } from 'react-router'

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-gray-600">
        <nav aria-label="Informations légales">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link to="/mentions-legales" className="hover:text-gray-900 hover:underline">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link to="/conditions" className="hover:text-gray-900 hover:underline">
                Conditions d'utilisation
              </Link>
            </li>
            <li>
              <Link to="/confidentialite" className="hover:text-gray-900 hover:underline">
                Confidentialité
              </Link>
            </li>
          </ul>
        </nav>
        <p className="sm:ml-auto">Données : Fragrantica (usage non commercial)</p>
      </div>
    </footer>
  )
}
