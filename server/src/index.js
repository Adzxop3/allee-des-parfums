import { app } from './app.js'

const port = process.env.PORT || 3001

if (process.env.NODE_ENV === 'production') {
  // Réglages indispensables en ligne : sans eux le site fonctionne, mais mal (voir .env.example)
  if (!process.env.SMTP_HOST) console.warn('Attention : SMTP_HOST absent, aucun email ne sera envoyé.')
  if (!process.env.APP_URL) console.warn('Attention : APP_URL absent, les liens et le référencement seront faux.')
}

// Express 5 appelle aussi ce callback en cas d'échec (ex. port déjà utilisé)
app.listen(port, (err) => {
  if (err) throw err
  console.log(`API démarrée sur http://localhost:${port}`)
})
