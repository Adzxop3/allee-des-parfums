import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { loadUser } from './auth.js'
import { browserCache, ONE_HOUR } from './cache.js'
import { pool } from './db.js'
import { limiter } from './rateLimit.js'
import { sameOrigin } from './security.js'
import { headTags, pageMeta, robotsTxt, sitemapXml } from './seo.js'
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

// L'application Express, sans démarrage du serveur : index.js la démarre, les tests aussi (sur un port libre)
export const app = express()
const production = process.env.NODE_ENV === 'production'

// Derrière un proxy en production (HTTPS), pour que req.ip soit l'adresse du visiteur :
// TRUST_PROXY=1 dans .env. Sans proxy, laisser vide.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY))

// Site React compilé (servi en production)
const dist = fileURLToPath(new URL('../../client/dist/', import.meta.url))
const indexHtml = production ? readFileSync(join(dist, 'index.html'), 'utf8') : ''
// index.html contient un petit script intégré (thème clair / sombre) : la CSP l'autorise par son
// empreinte SHA-256, et n'autorise aucun autre script intégré
const inlineScripts = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
  ([, code]) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`,
)
// Les balises de chaque page (titre, description, Open Graph, JSON-LD) remplacent ce titre (voir seo.js)
const DEFAULT_TITLE = '<title>Allée des parfums</title>'
if (production && !indexHtml.includes(DEFAULT_TITLE)) throw new Error(`${DEFAULT_TITLE} absent de client/dist/index.html`)

// En-têtes de sécurité. La politique de contenu n'autorise que ce site, plus les images des parfums
// (fimgs.net). Forcer HTTPS (HSTS, upgrade-insecure-requests) seulement en production.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': ["'self'", 'data:', 'https://fimgs.net'],
        'script-src': ["'self'", ...inlineScripts],
        // Styles et polices : seulement ceux du site (pas de style intégré à la page)
        'style-src': ["'self'"],
        'font-src': ["'self'"],
        'frame-ancestors': ["'none'"], // le site ne peut pas être affiché dans un cadre (clickjacking)
        'upgrade-insecure-requests': production ? [] : null,
      },
    },
    xFrameOptions: { action: 'deny' }, // même règle pour les anciens navigateurs
    strictTransportSecurity: production,
  }),
)
app.use(compression()) // réponses compressées (la carte complète passe de ~890 Ko à bien moins)

app.use(express.json({ limit: '20kb' }))
app.use(cookieParser())
// Limite générale par adresse IP (en plus des limites des connexions et publications) : freine
// l'aspiration massive du catalogue. Une visite normale reste loin de 1 500 requêtes en 15 minutes.
app.use('/api', limiter({ minutes: 15, limit: 1500, message: 'Trop de requêtes.' }))
app.use('/api', sameOrigin) // refuse les modifications demandées par un autre site (CSRF)
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

// Pour les moteurs de recherche : pages à explorer ou non, et plan du site
app.get('/robots.txt', browserCache(ONE_HOUR), (req, res) => res.type('text/plain').send(robotsTxt()))
app.get('/sitemap.xml', browserCache(ONE_HOUR), async (req, res) => res.type('application/xml').send(await sitemapXml()))

// En production, le même serveur sert le site React compilé (client/dist) : site et API ont
// la même adresse, comme en développement avec le proxy Vite.
if (production) {
  app.use(
    express.static(dist, {
      index: false,
      // Les fichiers de /assets ont un nom qui change à chaque version : on peut les garder longtemps
      setHeaders: (res, path) => {
        if (path.includes(`${sep}assets${sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      },
    }),
  )
  // Toutes les autres adresses (/perfumes/611, /carte...) sont affichées par React Router. Le serveur envoie
  // index.html avec les balises de la page (seo.js) et le bon code : 404 pour une page ou un parfum inexistant.
  app.get('/{*page}', async (req, res) => {
    const meta = await pageMeta(req.path, req.query)
    res.status(meta.status).set('Cache-Control', 'no-cache').type('html')
    res.send(indexHtml.replace(DEFAULT_TITLE, headTags(meta)))
  })
}

// Erreurs de la requête elle-même, détectées par express.json : réponse 4xx, rien dans les journaux
const REQUEST_ERRORS = {
  'entity.parse.failed': 'Données envoyées invalides (JSON attendu).',
  'entity.too.large': 'Données envoyées trop volumineuses.',
}

// Erreurs : réponse JSON plutôt que la page HTML par défaut
// (Express reconnaît un gestionnaire d'erreurs à ses 4 paramètres, même si le dernier ne sert pas)
app.use((err, req, res, _next) => {
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: REQUEST_ERRORS[err.type] ?? 'Requête invalide.' })
  }
  // Journal : la pile d'appels seulement. Jamais le contenu de la requête (mots de passe) ni l'objet
  // d'erreur complet (le détail d'une erreur SQL peut contenir un email ou d'autres données saisies).
  console.error(`Erreur sur ${req.method} ${req.path} :`, err.stack ?? err.message)
  res.status(500).json({ error: 'Erreur serveur' })
})
