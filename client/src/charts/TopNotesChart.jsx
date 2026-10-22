import { scaleLinear } from 'd3'
import { useNavigate } from 'react-router'
import { ChartTooltip } from './chartKit.jsx'
import { INK, INK_SECONDARY, formatInt, roundedBar, useTooltip, useWidth } from './chartUtils.js'

const COLOR = '#2a78d6' // une seule série : une seule couleur
const ROW = 28
const BAR = 16
const LABEL_WIDTH = 124
const VALUE_WIDTH = 52

// Barres horizontales : nombre de parfums par note. Un clic ouvre la page de la note.
export default function TopNotesChart({ notes }) {
  const [ref, width] = useWidth()
  const { tip, bind, containerRef, hideOnBackground } = useTooltip()
  const navigate = useNavigate()

  const x = scaleLinear()
    .domain([0, Math.max(1, ...notes.map((n) => n.perfume_count))])
    .range([0, Math.max(0, width - LABEL_WIDTH - VALUE_WIDTH)])

  return (
    <div ref={ref}>
      <div ref={containerRef} className="relative">
        <svg width={width} height={notes.length * ROW} onPointerDown={hideOnBackground} className="block">
          {notes.map((note, i) => {
            const y = i * ROW
            const length = Math.max(2, x(note.perfume_count))
            return (
              <g
                key={note.id}
                {...bind({ value: `${formatInt(note.perfume_count)} parfums`, label: note.name, color: COLOR })}
                role="link"
                aria-label={`${note.name} : ${formatInt(note.perfume_count)} parfums`}
                onClick={() => navigate(`/notes/${note.id}`)}
                onKeyDown={(event) => event.key === 'Enter' && navigate(`/notes/${note.id}`)}
              >
                {/* Zone de survol sur toute la ligne, plus grande que la barre */}
                <rect x={0} y={y} width={width} height={ROW} fill="transparent" />
                <text x={LABEL_WIDTH - 8} y={y + ROW / 2} dy="0.35em" textAnchor="end" fontSize={12} fill={INK}>
                  {note.name.length > 18 ? `${note.name.slice(0, 17)}…` : note.name}
                </text>
                <path d={roundedBar(LABEL_WIDTH, y + (ROW - BAR) / 2, length, BAR, 'right')} fill={COLOR} />
                <text x={LABEL_WIDTH + length + 6} y={y + ROW / 2} dy="0.35em" fontSize={11} fill={INK_SECONDARY}>
                  {formatInt(note.perfume_count)}
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
