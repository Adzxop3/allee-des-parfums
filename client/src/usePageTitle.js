import { useEffect } from 'react'

// Titre de l'onglet (aussi annoncé par les lecteurs d'écran à chaque changement de page)
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Allée des parfums` : 'Allée des parfums'
  }, [title])
}
