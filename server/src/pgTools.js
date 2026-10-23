import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

// Outils PostgreSQL (pg_dump, pg_restore) : dossier PG_BIN s'il est défini, sinon l'installation
// Windows par défaut de PostgreSQL 16, sinon le PATH.
const WINDOWS_DEFAULT = 'C:\\Program Files\\PostgreSQL\\16\\bin'

export function pgTool(name) {
  const dir = process.env.PG_BIN ?? (existsSync(WINDOWS_DEFAULT) ? WINDOWS_DEFAULT : null)
  return dir ? join(dir, process.platform === 'win32' ? `${name}.exe` : name) : name
}

// Base visée : DATABASE_URL (ex. Neon) si défini, sinon la base locale décrite par les variables PG*
export function targetDatabase() {
  return process.env.DATABASE_URL ?? process.env.PGDATABASE
}

// Lance l'outil en affichant sa sortie ; arrête le script en cas d'échec
export function run(name, args) {
  const result = spawnSync(pgTool(name), args, { stdio: 'inherit' })
  if (result.error) throw new Error(`Impossible de lancer ${name} : ${result.error.message} (définissez PG_BIN)`)
  if (result.status !== 0) throw new Error(`${name} a échoué (code ${result.status})`)
}
