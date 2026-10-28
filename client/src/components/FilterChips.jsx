import { chipClass } from '../ui/styles.js'

// Rangée de chips cliquables (un seul choix à la fois).
// Sur mobile, la rangée défile horizontalement au doigt au lieu de s'empiler.
export default function FilterChips({ options, value, onChange, label }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={chipClass(selected)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
