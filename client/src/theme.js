import { useSyncExternalStore } from 'react'

// Thème clair / sombre. Un script de index.html pose la classe .dark au chargement ;
// ce module la change ensuite et prévient les composants qui dessinent sur un canvas.
const EVENT = 'themechange'
const isDark = () => document.documentElement.classList.contains('dark')

export function setTheme(dark) {
  document.documentElement.classList.toggle('dark', dark)
  try {
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  } catch {
    // stockage indisponible (navigation privée stricte) : le choix vaut pour cette visite
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(callback) {
  window.addEventListener(EVENT, callback)
  return () => window.removeEventListener(EVENT, callback)
}

// true en mode sombre ; le composant se met à jour quand le thème change
export function useDarkMode() {
  return useSyncExternalStore(subscribe, isDark)
}

// Valeur d'une couleur du thème (variables de index.css), pour le dessin sur canvas
export function themeColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
}
