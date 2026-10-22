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
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              selected
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-300 bg-white hover:border-gray-500'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
