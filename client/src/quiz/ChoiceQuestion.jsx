// Réponses sous forme de cartes : boutons radio (un choix) ou cases à cocher (plusieurs).
// Ce sont de vrais champs de formulaire, masqués : clavier et lecteurs d'écran fonctionnent normalement.
export default function ChoiceQuestion({ question, value, onChange, labelledBy, examples = {} }) {
  const multiple = question.type === 'multi'
  const selected = multiple ? value : [value]
  const full = multiple && value.length >= question.max

  function toggle(optionValue) {
    if (!multiple) return onChange(optionValue)
    onChange(value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue])
  }

  return (
    <fieldset aria-labelledby={labelledBy} className="grid gap-2 sm:grid-cols-2">
      {question.options.map((option) => {
        const checked = selected.includes(option.value)
        const disabled = full && !checked
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-3 rounded border bg-white p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gray-900 ${
              checked ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-300 hover:border-gray-500'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={question.key}
              value={option.value}
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(option.value)}
              className="mt-1 accent-gray-900"
            />
            <span>
              <span className="flex items-center gap-2 font-medium">
                {option.color && (
                  <span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={{ background: option.color }} />
                )}
                {option.label}
              </span>
              {option.description && <span className="block text-sm text-gray-600">{option.description}</span>}
              {examples[option.value]?.length > 0 && (
                <span className="block text-sm text-gray-600">Ex. : {examples[option.value].join(', ')}</span>
              )}
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
