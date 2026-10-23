import { usePageTitle } from '../usePageTitle.js'

// Mise en page commune des pages légales (modèles à compléter par l'éditeur du site)
export default function LegalLayout({ title, updated, children }) {
  usePageTitle(title)
  return (
    <article className="mx-auto max-w-3xl space-y-6 leading-relaxed">
      <header>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-gray-600">Dernière mise à jour : {updated}</p>
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Modèle à adapter : les passages <Fill>surlignés entre crochets</Fill> sont à compléter avant la mise en ligne.
          Ce texte n'est pas un conseil juridique.
        </p>
      </header>
      {children}
    </article>
  )
}

export function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

// Information à compléter par l'éditeur (surlignée pour ne pas l'oublier)
export function Fill({ children }) {
  return <mark className="rounded bg-amber-100 px-1 text-amber-950">[{children}]</mark>
}
