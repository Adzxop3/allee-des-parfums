import { scaleLinear } from 'd3'
import { ACCORDS } from '../labels.js'
import { ChartTooltip, Legend } from './chartKit.jsx'
import { BASELINE, INK, INK_SECONDARY, formatInt, formatLean, roundedBar, useTooltip, useWidth } from './chartUtils.js'

// Barres divergentes : deux teintes opposées (froid / chaud) de part et d'autre de zéro
const WINTER = { label: 'Plutôt porté en hiver', color: 'var(--series-blue)' }
const SUMMER = { label: 'Plutôt porté en été', color: 'var(--series-red)' }

const ROW = 26
const BAR = 16
const LABEL_WIDTH = 110
const VALUE_SPACE = 34 // place pour la valeur au bout des barres, de chaque côté

// accords = [{ accord, lean, perfumes }] triés du plus « hiver » au plus « été »
export default function SeasonAccordsChart({ accords }) {
  const [ref, width] = useWidth()
  const { tip, bind, containerRef, hideOnBackground } = useTooltip()

  const extent = Math.max(0.01, ...accords.map((a) => Math.abs(a.lean)))
  const x = scaleLinear()
    .domain([-extent, extent])
    .range([LABEL_WIDTH + VALUE_SPACE, Math.max(LABEL_WIDTH + VALUE_SPACE, width - VALUE_SPACE)])
  const zero = x(0)

  return (
    <div ref={ref}>
      <Legend items={[WINTER, SUMMER]} />
      <div ref={containerRef} className="relative mt-3">
        <svg width={width} height={accords.length * ROW} onPointerDown={hideOnBackground} className="block">
          {accords.map((a, i) => {
            const y = i * ROW
            const isSummer = a.lean > 0
            const season = isSummer ? SUMMER : WINTER
            const end = x(a.lean)
            const left = Math.min(zero, end)
            const length = Math.max(2, Math.abs(end - zero))
            const name = ACCORDS[a.accord] ?? a.accord
            return (
              <g
                key={a.accord}
                {...bind({
                  value: `${formatLean(a.lean)} points`,
                  label: `${name} : ${isSummer ? 'plus porté en été' : 'plus porté en hiver'} (${formatInt(a.perfumes)} parfums)`,
                  color: season.color,
                })}
                aria-label={`${name} : ${formatLean(a.lean)} points`}
              >
                <rect x={0} y={y} width={width} height={ROW} fill="transparent" />
                <text x={LABEL_WIDTH - 8} y={y + ROW / 2} dy="0.35em" textAnchor="end" fontSize={12} fill={INK}>
                  {name}
                </text>
                <path
                  d={roundedBar(isSummer ? zero : left, y + (ROW - BAR) / 2, length, BAR, isSummer ? 'right' : 'left')}
                  fill={season.color}
                />
                <text
                  x={isSummer ? end + 5 : end - 5}
                  y={y + ROW / 2}
                  dy="0.35em"
                  textAnchor={isSummer ? 'start' : 'end'}
                  fontSize={11}
                  fill={INK_SECONDARY}
                >
                  {formatLean(a.lean)}
                </text>
              </g>
            )
          })}
          <line x1={zero} x2={zero} y1={0} y2={accords.length * ROW} stroke={BASELINE} />
        </svg>
        <ChartTooltip tip={tip} width={width} />
      </div>
    </div>
  )
}
