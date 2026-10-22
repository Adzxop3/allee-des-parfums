import cookieParser from 'cookie-parser'
import express from 'express'
import { loadUser } from './auth.js'
import { pool } from './db.js'
import authRouter from './routes/auth.js'
import collectionRouter from './routes/collection.js'
import recommendationsRouter from './routes/recommendations.js'
import mapRouter from './routes/map.js'
import moodsRouter from './routes/moods.js'
import statsRouter from './routes/stats.js'
import notesRouter from './routes/notes.js'
import perfumesRouter from './routes/perfumes.js'

const app = express()
const port = process.env.PORT || 3001

// Derrière un proxy en production (HTTPS), pour que req.ip soit l'adresse du visiteur :
// TRUST_PROXY=1 dans .env. Sans proxy, laisser vide.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY))

app.use(express.json({ limit: '20kb' }))
app.use(cookieParser())
app.use(loadUser) // renseigne req.user à partir du cookie de session

// Vérifie que l'API répond et que la base est joignable
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ api: 'ok', database: 'ok' })
  } catch (err) {
    res.status(500).json({ api: 'ok', database: 'error', message: err.message })
  }
})

app.use('/api/auth', authRouter)
app.use('/api/collection', collectionRouter)
app.use('/api/recommendations', recommendationsRouter)
app.use('/api/perfumes', perfumesRouter)
app.use('/api/notes', notesRouter)
app.use('/api/moods', moodsRouter)
app.use('/api/map', mapRouter)
app.use('/api/stats', statsRouter)

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
