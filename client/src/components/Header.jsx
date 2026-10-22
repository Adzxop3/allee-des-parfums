import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router'
import SurpriseButton from './SurpriseButton.jsx'

const SECTIONS = [
  { to: '/', label: 'Recherche', end: true },
  { to: '/notes', label: 'Notes' },
  { to: '/ambiances', label: 'Ambiances' },
  { to: '/carte', label: 'Carte' },
  { to: '/chiffres', label: 'En chiffres' },
]

// En-tête : liens visibles sur grand écran, bouton « Menu » sur mobile.
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
    <header className="border-b border-gray-200 bg-white">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-30 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Aller au contenu
      </a>

      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link to="/" className="text-lg font-bold">
          Parfums
        </Link>

        <nav aria-label="Navigation principale" className="hidden md:block">
          <ul className="flex gap-5">
            {SECTIONS.map((section) => (
              <li key={section.to}>
                <NavLink
                  to={section.to}
                  end={section.end}
                  className={({ isActive }) =>
                    `text-sm ${isActive ? 'font-semibold text-gray-900' : 'text-gray-600 hover:text-gray-900'}`
                  }
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SurpriseButton className="rounded-full bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-60">
            Surprends-moi
          </SurpriseButton>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            className="flex items-center gap-1.5 rounded border border-gray-300 px-2.5 py-1.5 text-sm md:hidden"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" stroke="currentColor" strokeWidth="1.5">
              {open ? <path d="M3 3l10 10M13 3L3 13" /> : <path d="M2 4h12M2 8h12M2 12h12" />}
            </svg>
            Menu
          </button>
        </div>
      </div>

      {open && (
        <nav id="menu-mobile" aria-label="Navigation principale" className="border-t border-gray-200 md:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-1">
            {SECTIONS.map((section) => (
              <li key={section.to}>
                <NavLink
                  to={section.to}
                  end={section.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block py-3 ${isActive ? 'font-semibold text-gray-900' : 'text-gray-700'}`
                  }
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
