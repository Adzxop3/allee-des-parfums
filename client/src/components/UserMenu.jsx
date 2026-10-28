import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext.js'

// Grand écran : lien « Connexion », ou nom de l'utilisateur ouvrant un petit menu
export default function UserMenu() {
  const { user, checking, logout } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Échap ou un clic ailleurs referme le menu
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => event.key === 'Escape' && setOpen(false)
    const onPointerDown = (event) => !ref.current.contains(event.target) && setOpen(false)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  if (checking) return null
  if (!user) {
    return (
      <Link to="/connexion" state={{ from: location.pathname + location.search }} className="text-sm text-ink-soft hover:text-ink">
        Connexion
      </Link>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="menu-utilisateur"
        className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <span className="max-w-40 truncate">{user.displayName}</span>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" fill="currentColor">
          <path d="M3 6l5 5 5-5z" />
        </svg>
      </button>
      {open && (
        <div
          id="menu-utilisateur"
          className="absolute right-0 z-30 mt-2 w-56 card p-2 text-sm shadow-lg"
        >
          <p className="truncate px-2 py-1 text-muted">{user.email}</p>
          <Link to="/parfumotheque" className="mt-1 block rounded px-2 py-1.5 hover:bg-surface-2">
            Ma parfumothèque
          </Link>
          <Link to="/compte" className="block rounded px-2 py-1.5 hover:bg-surface-2">
            Mon compte
          </Link>
          {user.isAdmin && (
            <Link to="/admin" className="block rounded px-2 py-1.5 hover:bg-surface-2">
              Modération
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            className="mt-1 w-full rounded px-2 py-1.5 text-left hover:bg-surface-2"
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}
