import { useEffect, useRef, useState } from 'react'

// Encres et traits des graphiques (palette de référence dataviz)
export const INK = '#0b0b0b'
export const INK_SECONDARY = '#52514e'
export const INK_MUTED = '#898781'
export const GRID = '#e1e0d9'
export const BASELINE = '#c3c2b7'

export const formatInt = (n) => n.toLocaleString('fr-FR')
export const formatPercent = (share) => `${Math.round(share * 100)} %`

// Largeur disponible d'un élément, mise à jour au redimensionnement
export function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

// Rectangle aux coins arrondis du seul côté « valeur » (le côté de la base reste carré)
export function roundedBar(x, y, width, height, side, radius = 4) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  if (side === 'top') {
    return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`
  }
  if (side === 'right') {
    return `M${x},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height - r}Q${x + width},${y + height} ${x + width - r},${y + height}H${x}Z`
  }
  // left
  return `M${x + width},${y}H${x + r}Q${x},${y} ${x},${y + r}V${y + height - r}Q${x},${y + height} ${x + r},${y + height}H${x + width}Z`
}

// Infobulle : survol à la souris, toucher sur mobile, focus au clavier.
// bind(contenu) renvoie les props à poser sur une marque du graphique.
export function useTooltip() {
  const [tip, setTip] = useState(null)
  const containerRef = useRef(null)

  function bind(content) {
    const show = (event) => {
      const container = containerRef.current
      const box = container.getBoundingClientRect()
      // scrollLeft : le conteneur peut défiler horizontalement (heatmap sur mobile)
      const offset = container.scrollLeft - box.left
      if (event.type === 'focus') {
        const mark = event.currentTarget.getBoundingClientRect()
        setTip({ x: mark.left + mark.width / 2 + offset, y: mark.top - box.top, content })
      } else {
        setTip({ x: event.clientX + offset, y: event.clientY - box.top, content })
      }
    }
    return {
      tabIndex: 0,
      className: 'chart-mark',
      onPointerEnter: show,
      onPointerMove: show,
      onFocus: show,
      // Au toucher, le doigt « quitte » la marque dès qu'il se lève : on garde l'infobulle
      onPointerLeave: (event) => event.pointerType !== 'touch' && setTip(null),
      onBlur: () => setTip(null),
    }
  }

  // Toucher le fond du graphique ferme l'infobulle
  const hideOnBackground = (event) => {
    if (event.target === event.currentTarget) setTip(null)
  }

  return { tip, bind, containerRef, hideOnBackground }
}

// Écart en points de pourcentage, avec son signe : « −27 », « +36 »
export const formatLean = (lean) => {
  const points = Math.round(lean * 100)
  return points > 0 ? `+${points}` : points < 0 ? `−${-points}` : '0'
}
