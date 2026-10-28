import { setTheme, useDarkMode } from '../theme.js'

// Bouton mode clair / mode sombre (le choix est mémorisé dans le navigateur)
export default function ThemeToggle() {
  const dark = useDarkMode()
  return (
    <button
      type="button"
      onClick={() => setTheme(!dark)}
      aria-pressed={dark}
      title="Mode sombre"
      className="inline-flex size-9 items-center justify-center rounded-md text-ink-soft hover:bg-surface-2 hover:text-ink"
    >
      <span className="sr-only">Mode sombre</span>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        {dark ? (
          // Soleil : revenir au mode clair
          <>
            <circle cx="10" cy="10" r="3.5" />
            <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6L16 16M4 16l1.4-1.4M14.6 5.4L16 4" />
          </>
        ) : (
          // Lune
          <path d="M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9z" />
        )}
      </svg>
    </button>
  )
}
