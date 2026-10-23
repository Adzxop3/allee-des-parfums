import { pool } from './db.js'

// Donne le rôle d'administrateur (modération) à un compte existant.
// Usage : npm run make-admin -- email@exemple.com   (ajouter --remove pour retirer le rôle)
const email = process.argv[2]?.trim().toLowerCase()
const role = process.argv.includes('--remove') ? 'user' : 'admin'

if (!email) {
  console.error('Usage : npm run make-admin -- email@exemple.com [--remove]')
  process.exitCode = 1
} else {
  const { rows } = await pool.query('UPDATE users SET role = $2 WHERE email = $1 RETURNING display_name', [email, role])
  if (rows.length) console.log(`${rows[0].display_name} (${email}) a maintenant le rôle « ${role} ».`)
  else {
    console.error(`Aucun compte avec l'email ${email}.`)
    process.exitCode = 1
  }
}
await pool.end()
