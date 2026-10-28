import { Component } from 'react'
import { buttonClass } from '../ui/styles.js'

// Filet de sécurité : si une page plante pendant son affichage, on montre un message
// au lieu d'une page blanche. App le recrée à chaque changement de page (key), ce qui le réinitialise.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error('Erreur d’affichage :', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="mx-auto max-w-xl rounded border border-danger-line bg-danger-bg p-4 text-danger">
        <h1 className="text-xl font-semibold">Cette page a rencontré un problème</h1>
        <p className="mt-2">Rechargez la page, ou revenez à l'accueil. Si le problème continue, réessayez plus tard.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={buttonClass()}
          >
            Recharger
          </button>
          <a href="/" className={buttonClass({ variant: 'secondary' })}>
            Retour à l'accueil
          </a>
        </div>
      </div>
    )
  }
}
