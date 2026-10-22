import nodemailer from 'nodemailer'

// Envoi d'emails par SMTP, configuré dans .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM).
// Sans SMTP_HOST (développement), l'email est affiché dans la console du serveur.
const transport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465, // TLS direct sur le port 465, STARTTLS sinon
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null

// Adresse du site, pour construire les liens envoyés par email
export const APP_URL = process.env.APP_URL || 'http://localhost:5173'

export async function sendMail({ to, subject, text }) {
  if (!transport) {
    console.log(`\n--- Email (non envoyé : SMTP non configuré) ---\nÀ : ${to}\nObjet : ${subject}\n\n${text}\n---\n`)
    return
  }
  await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text })
}
