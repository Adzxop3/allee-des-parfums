import { pointer, quadtree, select, zoom, zoomIdentity } from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'

const FADED_COLOR = '#dcdbd5'
const HIT_RADIUS = 24 // tolérance (px) autour d'un point pour le clic / toucher

// Carte en Canvas : des dizaines de milliers de points restent fluides (le SVG ne suivrait pas).
// points : [{ id, x, y, group: { key, color } }] avec x et y entre 0 et 1.
export default function OlfactoryMap({ points, highlight, selectedId, onSelect }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const zoomRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [transform, setTransform] = useState(zoomIdentity)

  // Suit la taille du conteneur (rotation d'écran, redimensionnement)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Zoom et déplacement : molette et glisser à la souris, pincer et glisser au doigt
  useEffect(() => {
    const behavior = zoom()
      .scaleExtent([1, 40])
      .clickDistance(4) // un glisser ne compte pas comme un clic
      .on('zoom', (event) => setTransform(event.transform))
    zoomRef.current = behavior
    select(canvasRef.current).call(behavior)
  }, [])

  // Position des points avant zoom : la carte est carrée et centrée dans le cadre
  const placed = useMemo(() => {
    const side = Math.min(size.width, size.height) * 0.94
    const left = (size.width - side) / 2
    const top = (size.height - side) / 2
    return points.map((p) => ({ ...p, px: left + p.x * side, py: top + p.y * side }))
  }, [points, size])

  const tree = useMemo(() => quadtree(placed, (p) => p.px, (p) => p.py), [placed])

  // Dessin : un seul chemin par couleur, les points hors de l'écran sont ignorés
  useEffect(() => {
    const canvas = canvasRef.current
    const ratio = window.devicePixelRatio || 1
    if (canvas.width !== size.width * ratio) canvas.width = size.width * ratio
    if (canvas.height !== size.height * ratio) canvas.height = size.height * ratio
    const ctx = canvas.getContext('2d')
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.clearRect(0, 0, size.width, size.height)

    const radius = Math.min(6, 1.5 + transform.k * 0.4)
    const byColor = new Map()
    const faded = []
    for (const p of placed) {
      const x = transform.applyX(p.px)
      const y = transform.applyY(p.py)
      if (x < -radius || y < -radius || x > size.width + radius || y > size.height + radius) continue
      if (highlight && p.group.key !== highlight) faded.push([x, y])
      else {
        if (!byColor.has(p.group.color)) byColor.set(p.group.color, [])
        byColor.get(p.group.color).push([x, y])
      }
    }

    const fill = (color, list) => {
      ctx.fillStyle = color
      ctx.beginPath()
      for (const [x, y] of list) {
        ctx.moveTo(x + radius, y)
        ctx.arc(x, y, radius, 0, 2 * Math.PI)
      }
      ctx.fill()
    }
    // Les points estompés d'abord, pour que la famille isolée passe au-dessus
    fill(FADED_COLOR, faded)
    ctx.globalAlpha = 0.85
    for (const [color, list] of byColor) fill(color, list)
    ctx.globalAlpha = 1

    // Point sélectionné : anneau blanc puis anneau foncé
    const selected = placed.find((p) => p.id === selectedId)
    if (selected) {
      const x = transform.applyX(selected.px)
      const y = transform.applyY(selected.py)
      ctx.lineWidth = 3
      ctx.strokeStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(x, y, radius + 4, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#0b0b0b'
      ctx.stroke()
    }
  }, [placed, size, transform, highlight, selectedId])

  // Clic ou toucher : le point le plus proche dans un rayon de HIT_RADIUS pixels
  function handleClick(event) {
    const [x, y] = transform.invert(pointer(event))
    const found = tree.find(x, y, HIT_RADIUS / transform.k)
    onSelect(found ? found.id : null)
  }

  function recenter() {
    select(canvasRef.current).transition().duration(400).call(zoomRef.current.transform, zoomIdentity)
  }

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        role="img"
        aria-label={`Carte olfactive de ${points.length} parfums : les parfums proches se ressemblent`}
        className="block h-full w-full cursor-crosshair touch-none"
        style={{ width: size.width, height: size.height }}
      />
      {transform.k !== 1 && (
        <button
          type="button"
          onClick={recenter}
          className="absolute bottom-3 left-3 rounded border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm"
        >
          Recentrer
        </button>
      )}
    </div>
  )
}
