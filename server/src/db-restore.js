import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { run } from './pgTools.js'

// Restaure une sauvegarde (npm run db:backup) dans la base DATABASE_URL, typiquement la base de production.
// Usage : npm run db:restore -- data/backups/parfums-....dump --yes
// ATTENTION : le contenu de la base visée est remplacé (tables supprimées puis recréées).
// npm lance le script depuis server/ : le chemin est relu depuis le dossier où la commande a été tapée
const file = process.argv[2] && resolve(process.env.INIT_CWD ?? process.cwd(), process.argv[2])
const confirmed = process.argv.includes('--yes')

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL non défini : par sécurité, la restauration ne vise jamais la base locale par défaut.')
  process.exitCode = 1
} else if (!file || !existsSync(file)) {
  console.error('Usage : npm run db:restore -- chemin/vers/sauvegarde.dump --yes')
  process.exitCode = 1
} else if (!confirmed) {
  console.error('Le contenu de la base DATABASE_URL va être remplacé. Relancez avec --yes pour confirmer.')
  process.exitCode = 1
} else {
  console.log(`Restauration de ${file} dans la base DATABASE_URL…`)
  run('pg_restore', ['--clean', '--if-exists', '--no-owner', '--no-privileges', `--dbname=${process.env.DATABASE_URL}`, file])
  console.log('Restauration terminée.')
}
