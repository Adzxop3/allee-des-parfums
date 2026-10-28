import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext.js'
import { buttonClass } from '../ui/styles.js'
import SurpriseButton from './SurpriseButton.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import UserMenu from './UserMenu.jsx'

const SECTIONS = [
  { to: '/', label: 'Recherche', end: true },
  { to: '/notes', label: 'Notes' },
  { to: '/ambiances', label: 'Ambiances' },
  { to: '/carte', label: 'Carte' },
  { to: '/chiffres', label: 'En chiffres' },
  { to: '/questionnaire', label: 'Questionnaire' },
]

// En-tête : liens visibles sur grand écran (à partir de 1024 px), bouton « Menu » en dessous.
// App le remonte à chaque changement de page (key), ce qui referme le menu mobile.
export default function Header() {
  const [open, setOpen] = useState(false)

  // Échap referme le menu mobile
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <header className="border-b border-line bg-surface">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-30 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:shadow"
      >
        Aller au contenu
      </a>

      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 lg:gap-6">
        <Link to="/" className="font-serif text-base font-semibold tracking-tight whitespace-nowrap sm:text-xl">
          Allée des parfums
        </Link>

        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="flex gap-5">
            {SECTIONS.map((section) => (
              <li key={section.to}>
                <NavLink
                  to={section.to}
                  end={section.end}
                  className={({ isActive }) =>
                    `text-sm ${isActive ? 'font-medium text-ink underline decoration-accent decoration-2 underline-offset-8' : 'text-muted hover:text-ink'}`
                  }
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:gap-4">
          <div className="hidden lg:block">
            <UserMenu />
          </div>
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
          <SurpriseButton className={buttonClass({ size: 'sm', shape: 'pill' })}>
            Surprends-moi
          </SurpriseButton>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            className={buttonClass({ variant: 'secondary', size: 'sm', className: 'lg:hidden' })}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" stroke="currentColor" strokeWidth="1.5">
              {open ? <path d="M3 3l10 10M13 3L3 13" /> : <path d="M2 4h12M2 8h12M2 12h12" />}
            </svg>
            <span className="sr-only sm:not-sr-only">Menu</span>
          </button>
        </div>
      </div>

      {open && (
        <nav id="menu-mobile" aria-label="Navigation principale" className="border-t border-line lg:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-1">
            {SECTIONS.map((section) => (
              <li key={section.to}>
                <NavLink
                  to={section.to}
                  end={section.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block py-3 ${isActive ? 'font-semibold text-accent' : 'text-ink-soft'}`
                  }
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <MobileAccount />
          <div className="mx-auto flex max-w-6xl items-center justify-between border-t border-line px-4 py-2">
            <span aria-hidden="true" className="text-ink-soft">Mode sombre</span>
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  )
}

// Compte dans le menu mobile : connexion / inscription, ou nom et déconnexion
function MobileAccount() {
  const { user, checking, logout } = useAuth()
  const location = useLocation()
  if (checking) return null

  return (
    <div className="mx-auto max-w-6xl border-t border-line px-4 py-2">
      {user ? (
        <>
          <p className="py-2 text-sm text-muted">
            Connecté : <span className="font-medium text-ink">{user.displayName}</span>
          </p>
          <Link to="/parfumotheque" className="block py-3 text-ink-soft">
            Ma parfumothèque
          </Link>
          <Link to="/compte" className="block py-3 text-ink-soft">
            Mon compte
          </Link>
          {user.isAdmin && (
            <Link to="/admin" className="block py-3 text-ink-soft">
              Modération
            </Link>
          )}
          <button type="button" onClick={logout} className="block w-full py-3 text-left text-ink-soft">
            Se déconnecter
          </button>
        </>
      ) : (
        <ul>
          <li>
            <Link to="/connexion" state={{ from: location.pathname + location.search }} className="block py-3 text-ink-soft">
              Connexion
            </Link>
          </li>
          <li>
            <Link to="/inscription" state={{ from: location.pathname + location.search }} className="block py-3 text-ink-soft">
              Créer un compte
            </Link>
          </li>
        </ul>
      )}
    </div>
  )
}
