import { scaleLinear } from 'd3'
import { useNavigate } from 'react-router'
import { ChartTooltip } from './chartKit.jsx'
import { INK, INK_SECONDARY, roundedBar, useTooltip, useWidth } from './chartUtils.js'

const COLOR = 'var(--series-blue)' // une seule série : une seule couleur
const ROW = 28
const BAR = 16
const LABEL_WIDTH = 124
const VALUE_WIDTH = 52

// Barres horizontales : items = [{ key, label, value, href? }].
// formatValue(value) : texte au bout de la barre et dans l'infobulle. Une barre avec href est un lien.
export default function BarList({ items, formatValue }) {
  const [ref, width] = useWidth()
  const { tip, bind, containerRef, hideOnBackground } = useTooltip()
  const navigate = useNavigate()

  const x = scaleLinear()
    .domain([0, Math.max(1, ...items.map((item) => item.value))])
    .range([0, Math.max(0, width - LABEL_WIDTH - VALUE_WIDTH)])

  return (
    <div ref={ref}>
      <div ref={containerRef} className="relative">
        <svg width={width} height={items.length * ROW} onPointerDown={hideOnBackground} className="block">
          {items.map((item, i) => {
            const y = i * ROW
            const length = Math.max(2, x(item.value))
            const link = item.href
              ? {
                  role: 'link', // nom accessible = texte de la ligne (libellé et valeur)
                  onClick: () => navigate(item.href),
                  onKeyDown: (event) => event.key === 'Enter' && navigate(item.href),
                }
              : { 'aria-label': `${item.label} ${formatValue(item.value)}` }
            return (
              <g key={item.key} {...bind({ value: formatValue(item.value), label: item.label, color: COLOR })} {...link}>
                {/* Zone de survol sur toute la ligne, plus grande que la barre */}
                <rect x={0} y={y} width={width} height={ROW} fill="transparent" />
                <text x={LABEL_WIDTH - 8} y={y + ROW / 2} dy="0.35em" textAnchor="end" fontSize={12} fill={INK}>
                  {item.label.length > 18 ? `${item.label.slice(0, 17)}…` : item.label}
                </text>
                <path d={roundedBar(LABEL_WIDTH, y + (ROW - BAR) / 2, length, BAR, 'right')} fill={COLOR} />
                <text x={LABEL_WIDTH + length + 6} y={y + ROW / 2} dy="0.35em" fontSize={11} fill={INK_SECONDARY}>
                  {formatValue(item.value)}
                </text>
              </g>
            )
          })}
        </svg>
        <ChartTooltip tip={tip} width={width} />
      </div>
    </div>
  )
}
