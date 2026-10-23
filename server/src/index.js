import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { loadUser } from './auth.js'
import { pool } from './db.js'
import authRouter from './routes/auth.js'
import collectionRouter from './routes/collection.js'
import recommendationsRouter from './routes/recommendations.js'
import commentsRouter from './routes/comments.js'
import membersRouter from './routes/members.js'
import moderationRouter from './routes/moderation.js'
import reviewsRouter from './routes/reviews.js'
import mapRouter from './routes/map.js'
import moodsRouter from './routes/moods.js'
import statsRouter from './routes/stats.js'
import notesRouter from './routes/notes.js'
import perfumesRouter from './routes/perfumes.js'

const app = express()
const port = process.env.PORT || 3001
const production = process.env.NODE_ENV === 'production'

// Derrière un proxy en production (HTTPS), pour que req.ip soit l'adresse du visiteur :
// TRUST_PROXY=1 dans .env. Sans proxy, laisser vide.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY))

// En-têtes de sécurité. La politique de contenu n'autorise que ce site, plus les images des parfums
// (fimgs.net). Forcer HTTPS (HSTS, upgrade-insecure-requests) seulement en production.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': ["'self'", 'data:', 'https://fimgs.net'],
        'upgrade-insecure-requests': production ? [] : null,
      },
    },
    strictTransportSecurity: production,
  }),
)
app.use(compression()) // réponses compressées (la carte complète passe de ~890 Ko à bien moins)

app.use(express.json({ limit: '20kb' }))
app.use(cookieParser())
app.use('/api', loadUser) // renseigne req.user à partir du cookie de session

// Vérifie que l'API répond et que la base est joignable
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ api: 'ok', database: 'ok' })
  } catch (err) {
    // Le détail de l'erreur n'est montré qu'en développement
    res.status(500).json({ api: 'ok', database: 'error', message: production ? undefined : err.message })
  }
})

app.use('/api/auth', authRouter)
app.use('/api/collection', collectionRouter)
app.use('/api/recommendations', recommendationsRouter)
app.use('/api', reviewsRouter) // /api/perfumes/:id/reviews et /api/reviews/:id
app.use('/api', commentsRouter) // /api/reviews/:id/comments et /api/comments/:id
app.use('/api/members', membersRouter)
app.use('/api', moderationRouter) // /api/reports et /api/admin/...
app.use('/api/perfumes', perfumesRouter)
app.use('/api/notes', notesRouter)
app.use('/api/moods', moodsRouter)
app.use('/api/map', mapRouter)
app.use('/api/stats', statsRouter)

// Route d'API inconnue : réponse JSON (et non la page du site)
app.use('/api', (req, res) => res.status(404).json({ error: 'Route inconnue' }))

// En production, le même serveur sert le site React compilé (client/dist) : site et API ont
// la même adresse, comme en développement avec le proxy Vite.
if (production) {
  const dist = fileURLToPath(new URL('../../client/dist/', import.meta.url))
  app.use(
    express.static(dist, {
      index: false,
      // Les fichiers de /assets ont un nom qui change à chaque version : on peut les garder longtemps
      setHeaders: (res, path) => {
        if (path.includes(`${sep}assets${sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      },
    }),
  )
  // Toutes les autres adresses (/perfumes/611, /carte...) sont gérées par React Router
  app.get('/{*page}', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(join(dist, 'index.html'))
  })
}

// Erreurs inattendues : réponse JSON plutôt que la page HTML par défaut
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erreur serveur' })
})

// Express 5 appelle aussi ce callback en cas d'échec (ex. port déjà utilisé)
app.listen(port, (err) => {
  if (err) throw err
  console.log(`API démarrée sur http://localhost:${port}`)
})
