import { ErrorMessage, Loading } from '../components/Status.jsx'

// Contenu : { value, label, color } — la valeur d'abord, le libellé ensuite
export function ChartTooltip({ tip, width }) {
  if (!tip) return null
  const left = Math.max(80, Math.min(width - 80, tip.x))
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 max-w-48 -translate-x-1/2 -translate-y-full rounded border border-gray-200 bg-white px-2 py-1 text-xs shadow"
      style={{ left, top: tip.y - 8 }}
    >
      <p className="font-semibold text-gray-900">{tip.content.value}</p>
      <p className="flex items-center gap-1.5 text-gray-600">
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
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
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
// puis le graphique, une note sur les limites et le tableau des données
export function ChartCard({ title, subtitle, children, note, table, state }) {
  return (
    <section className="rounded border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-semibold leading-snug">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      <div className="mt-4">
        {state?.error && <ErrorMessage message={state.error} onRetry={state.reload} />}
        {state?.loading && !state.data && <Loading />}
        {children}
      </div>
      {note && <p className="mt-3 text-xs text-gray-500">{note}</p>}
      {table && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-gray-700">Voir les données</summary>
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
        <tr className="border-b border-gray-200">
          {columns.map((column) => (
            <th key={column.label} className={`py-1 pr-3 font-semibold ${column.align === 'right' ? 'text-right' : ''}`}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-100">
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
