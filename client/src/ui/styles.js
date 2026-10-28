// Styles partagés du design system (direction « Maison de parfum »).
// Ce sont des chaînes de classes Tailwind : elles servent aussi bien sur un <button> que sur un <Link>.
// Les couleurs viennent des variables de index.css (clair et sombre).

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-field bg-surface text-ink hover:bg-surface-2',
  danger: 'bg-danger text-on-danger hover:bg-danger-hover',
}
const BUTTON_SIZES = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2',
}

// Bouton : variant primary | secondary | danger, size sm | md, shape rounded | pill
export function buttonClass({ variant = 'primary', size = 'md', shape = 'rounded', className = '' } = {}) {
  return [
    'inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60',
    shape === 'pill' ? 'rounded-full' : 'rounded-md',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  ].join(' ')
}

// Champ de saisie, liste déroulante ou zone de texte
export function inputClass({ size = 'md', error = false, className = '' } = {}) {
  return [
    'rounded-md border bg-surface text-ink placeholder:text-muted disabled:bg-surface-2',
    size === 'sm' ? 'px-2 py-1' : 'px-3 py-2',
    error ? 'border-danger' : 'border-field',
    className,
  ].join(' ')
}

// Pastille cliquable (filtres) ; selected : choix actif
export function chipClass(selected) {
  return `shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
    selected ? 'border-accent bg-accent text-on-accent' : 'border-field bg-surface text-ink hover:border-ink-soft'
  }`
}

// Cartes et liens : utilitaires « card » et « link » définis dans index.css
