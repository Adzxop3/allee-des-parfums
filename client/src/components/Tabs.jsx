import { useRef } from 'react'

// Onglets accessibles : flèches gauche/droite, Début et Fin passent d'un onglet à l'autre.
// tabs : [{ key, label }] ; panelId : id du panneau affiché sous les onglets
export default function Tabs({ tabs, value, onChange, label, panelId, className = '' }) {
  const refs = useRef({})

  function onKeyDown(event) {
    const index = tabs.findIndex((tab) => tab.key === value)
    const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    const next = tabs[(moves[event.key] + tabs.length) % tabs.length].key
    onChange(next)
    refs.current[next].focus()
  }

  return (
    <div role="tablist" aria-label={label} className={`flex gap-1 overflow-x-auto border-b border-line ${className}`}>
      {tabs.map((tab) => {
        const selected = tab.key === value
        return (
          <button
            key={tab.key}
            ref={(el) => (refs.current[tab.key] = el)}
            type="button"
            role="tab"
            id={`onglet-${tab.key}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={onKeyDown}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm ${
              selected ? 'border-accent font-semibold text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
