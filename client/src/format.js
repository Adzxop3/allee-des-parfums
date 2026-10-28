// Mises en forme partagées (dates, élision)

// « 23 octobre 2026 »
export const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', { dateStyle: 'long' })

// « 23 oct. 2026, 14:05 »
export const formatDateTime = (date) =>
  new Date(date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

// « octobre 2026 »
export const formatMonth = (date) => new Date(date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

// « de Chanel », mais « d'Azzaro » (règle partagée avec le serveur)
export { withDe } from '../../shared/french.js'
