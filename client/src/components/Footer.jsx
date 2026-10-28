import { Link } from 'react-router'

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted">
        <nav aria-label="Informations légales">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link to="/mentions-legales" className="hover:text-ink hover:underline">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link to="/conditions" className="hover:text-ink hover:underline">
                Conditions d'utilisation
              </Link>
            </li>
            <li>
              <Link to="/confidentialite" className="hover:text-ink hover:underline">
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
