import { inputClass } from '../ui/styles.js'
// Liste déroulante de tri étiquetée. options : [{ value, label }]
export default function SortSelect({ label = 'Trier par', value, options, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      {label} :
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass({ size: 'sm' })}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
