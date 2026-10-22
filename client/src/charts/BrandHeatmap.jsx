import { interpolateRgb, piecewise, scaleLinear } from 'd3'
import { ACCORDS } from '../labels.js'
import { ChartTooltip } from './chartKit.jsx'
import { INK, INK_MUTED, formatPercent, useTooltip, useWidth } from './chartUtils.js'

// Dégradé séquentiel d'une seule teinte (bleu), du plus clair au plus foncé
const RAMP = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b']
const LABEL_WIDTH = 116
const HEADER = 78 // place pour les noms d'accords inclinés
const RIGHT = 56 // les noms inclinés dépassent à droite de la dernière colonne
const GAP = 2
const MIN_CELL = 28 // assez grand pour être touché du doigt
const MAX_CELL = 40

// Heatmap marques × accords : part des parfums de la marque où l'accord est dans le top 3.
// brands = noms dans l'ordre, accords = clés dans l'ordre, share(brand, accord) -> 0..1
export default function BrandHeatmap({ brands, accords, share }) {
  const [ref, width] = useWidth()
  const { tip, bind, containerRef, hideOnBackground } = useTooltip()

  // Sur un écran étroit, les cases gardent MIN_CELL et la heatmap défile horizontalement
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, (width - LABEL_WIDTH - RIGHT) / accords.length))
  const max = Math.max(0.01, ...brands.flatMap((b) => accords.map((a) => share(b, a))))
  const color = scaleLinear().domain([0, max]).range([0, 1]).clamp(true)
  const ramp = piecewise(interpolateRgb, RAMP)
  const chartWidth = LABEL_WIDTH + cell * accords.length + RIGHT

  return (
    <div ref={ref}>
      <div ref={containerRef} className="relative overflow-x-auto">
        <svg width={chartWidth} height={HEADER + cell * brands.length} onPointerDown={hideOnBackground} className="block">
          {accords.map((accord, j) => (
            <text
              key={accord}
              transform={`translate(${LABEL_WIDTH + j * cell + cell / 2},${HEADER - 6}) rotate(-50)`}
              fontSize={11}
              fill={INK}
            >
              {ACCORDS[accord] ?? accord}
            </text>
          ))}
          {brands.map((brand, i) => (
            <g key={brand}>
              <text x={LABEL_WIDTH - 8} y={HEADER + i * cell + cell / 2} dy="0.35em" textAnchor="end" fontSize={12} fill={INK}>
                {brand.length > 17 ? `${brand.slice(0, 16)}…` : brand}
              </text>
              {accords.map((accord, j) => {
                const value = share(brand, accord)
                const name = ACCORDS[accord] ?? accord
                return (
                  <rect
                    key={accord}
                    x={LABEL_WIDTH + j * cell + GAP / 2}
                    y={HEADER + i * cell + GAP / 2}
                    width={cell - GAP}
                    height={cell - GAP}
                    rx={2}
                    fill={ramp(color(value))}
                    {...bind({
                      value: formatPercent(value),
                      label: `${brand} : ${name} dans le top 3 de ${formatPercent(value)} des parfums`,
                    })}
                    aria-label={`${brand}, ${name} : ${formatPercent(value)}`}
                  />
                )
              })}
            </g>
          ))}
        </svg>
        <ChartTooltip tip={tip} width={chartWidth} />
      </div>

      {/* Échelle des couleurs */}
      <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: INK_MUTED }}>
        <span>0 %</span>
        <span className="h-2.5 w-40 rounded-sm" style={{ background: `linear-gradient(to right, ${RAMP.join(', ')})` }} />
        <span>{formatPercent(max)}</span>
      </div>
    </div>
  )
}
