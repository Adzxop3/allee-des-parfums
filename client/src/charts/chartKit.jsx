import { ErrorMessage, Loading } from '../components/Status.jsx'

// Contenu : { value, label, color } — la valeur d'abord, le libellé ensuite
export function ChartTooltip({ tip, width }) {
  if (!tip) return null
  const left = Math.max(80, Math.min(width - 80, tip.x))
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 max-w-48 -translate-x-1/2 -translate-y-full card px-2 py-1 text-xs shadow"
      style={{ left, top: tip.y - 8 }}
    >
      <p className="font-semibold text-ink">{tip.content.value}</p>
      <p className="flex items-center gap-1.5 text-muted">
        {tip.content.color && (
          <span className="inline-block h-0.5 w-3 shrink-0" style={{ background: tip.content.color }} />
        )}
        {tip.content.label}
      </p>
    </div>
  )
}

// Légende : pastille de couleur + libellé (le texte reste dans l'encre normale)
export function Legend({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

// Cadre commun : titre = l'enseignement, sous-titre = ce qui est mesuré,
// puis le graphique, une note sur les limites et le tableau des données.
// chartHeight : hauteur prévue du graphique (px), réservée pendant le chargement pour que la page ne saute pas
export function ChartCard({ title, subtitle, children, note, table, state, chartHeight }) {
  return (
    <section className="card p-4">
      <h2 className="text-lg font-semibold leading-snug">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-4" style={state?.loading && !state.data ? { minHeight: chartHeight } : undefined}>
        {state?.error && <ErrorMessage message={state.error} onRetry={state.reload} />}
        {state?.loading && !state.data && <Loading />}
        {children}
      </div>
      {note && <p className="mt-3 text-xs text-muted">{note}</p>}
      {table && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-ink-soft">Voir les données</summary>
          <div className="mt-2 overflow-x-auto">{table}</div>
        </details>
      )}
    </section>
  )
}

// Tableau simple : columns = [{ label, align }], rows = [[cellule, ...]]
export function DataTable({ columns, rows }) {
  return (
    <table className="w-full text-left text-xs tabular-nums">
      <thead>
        <tr className="border-b border-line">
          {columns.map((column) => (
            <th key={column.label} className={`py-1 pr-3 font-semibold ${column.align === 'right' ? 'text-right' : ''}`}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-line">
            {row.map((cell, j) => (
              <td key={j} className={`py-1 pr-3 ${columns[j].align === 'right' ? 'text-right' : ''}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
