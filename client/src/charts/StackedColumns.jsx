import { scaleBand, scaleLinear } from 'd3'
import { ChartTooltip, Legend } from './chartKit.jsx'
import {
  BASELINE,
  GRID,
  INK_MUTED,
  INK_SECONDARY,
  formatInt,
  formatPercent,
  roundedBar,
  useTooltip,
  useWidth,
} from './chartUtils.js'

const HEIGHT = 240
const MARGIN = { top: 8, right: 4, bottom: 40, left: 40 }
const GAP = 2 // espace de la couleur du fond entre deux segments
const MAX_COLUMN = 24

// Colonnes empilées à 100 % : répartition de chaque colonne entre les séries.
// columns = [{ key, label, total, counts: { [serie]: n } }], series = [{ key, label, color }]
export default function StackedColumns({ columns, series }) {
  const [ref, width] = useWidth()
  const { tip, bind, containerRef, hideOnBackground } = useTooltip()

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const x = scaleBand()
    .domain(columns.map((c) => c.key))
    .range([0, plotWidth])
    .padding(0.3)
  const columnWidth = Math.min(MAX_COLUMN, x.bandwidth())
  const y = scaleLinear().domain([0, 1]).range([plotHeight, 0])

  return (
    <div ref={ref}>
      <Legend items={series} />
      <div ref={containerRef} className="relative mt-3">
        <svg width={width} height={HEIGHT} onPointerDown={hideOnBackground} className="block">
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
              <g key={tick}>
                <line x1={0} x2={plotWidth} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? BASELINE : GRID} />
                <text x={-6} y={y(tick)} dy="0.35em" textAnchor="end" fontSize={11} fill={INK_MUTED}>
                  {formatPercent(tick)}
                </text>
              </g>
            ))}

            {columns.map((column) => {
              const left = x(column.key) + (x.bandwidth() - columnWidth) / 2
              const present = series.filter((s) => column.counts[s.key])
              let cumulated = 0
              return (
                <g key={column.key}>
                  {present.map((s, i) => {
                    const share = column.counts[s.key] / column.total
                    const top = y(cumulated + share)
                    const height = Math.max(0, y(cumulated) - top - (i < present.length - 1 ? GAP : 0))
                    cumulated += share
                    const isTop = i === present.length - 1
                    return (
                      <path
                        key={s.key}
                        d={roundedBar(left, top + (isTop ? 0 : GAP), columnWidth, height, 'top', isTop ? 4 : 0)}
                        fill={s.color}
                        {...bind({
                          value: `${formatPercent(share)} (${formatInt(column.counts[s.key])} parfums)`,
                          label: `${s.label}, années ${column.label}`,
                          color: s.color,
                        })}
                        aria-label={`Années ${column.label}, ${s.label} : ${formatPercent(share)}`}
                      />
                    )
                  })}
                  <text
                    x={x(column.key) + x.bandwidth() / 2}
                    y={plotHeight + 16}
                    textAnchor="middle"
                    fontSize={11}
                    fill={INK_SECONDARY}
                  >
                    {column.label}
                  </text>
                  <text
                    x={x(column.key) + x.bandwidth() / 2}
                    y={plotHeight + 30}
                    textAnchor="middle"
                    fontSize={10}
                    fill={INK_MUTED}
                  >
                    {formatInt(column.total)}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
        <ChartTooltip tip={tip} width={width} />
      </div>
    </div>
  )
}
