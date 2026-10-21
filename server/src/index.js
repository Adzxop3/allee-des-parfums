import express from 'express'
import { pool } from './db.js'
import notesRouter from './routes/notes.js'
import perfumesRouter from './routes/perfumes.js'

const app = express()
const port = process.env.PORT || 3001

app.use(express.json())

// Vérifie que l'API répond et que la base est joignable
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ api: 'ok', database: 'ok' })
  } catch (err) {
    res.status(500).json({ api: 'ok', database: 'error', message: err.message })
  }
})

app.use('/api/perfumes', perfumesRouter)
app.use('/api/notes', notesRouter)

// Erreurs inattendues : réponse JSON plutôt que la page HTML par défaut
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erreur serveur' })
})

app.listen(port, () => {
  console.log(`API démarrée sur http://localhost:${port}`)
})
