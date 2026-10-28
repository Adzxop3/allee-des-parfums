// Protection contre les requêtes forgées depuis un autre site (CSRF), en plus du cookie SameSite=Lax.
// Un navigateur envoie l'en-tête Origin sur les requêtes qui modifient des données (POST, PUT, PATCH,
// DELETE) : il doit correspondre à ce site. Sans Origin (curl, tests, anciens navigateurs sur une
// requête du même site), la requête passe : ce ne peut pas être une page piégée d'un autre site.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const siteOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : null

export function sameOrigin(req, res, next) {
  const origin = req.get('origin')
  if (SAFE_METHODS.has(req.method) || !origin) return next()
  // L'adresse demandée (derrière le proxy de l'hébergeur, protocole d'origine grâce à trust proxy) ou APP_URL
  if (origin === `${req.protocol}://${req.get('host')}` || origin === siteOrigin) return next()
  res.status(403).json({ error: 'Requête refusée : elle ne vient pas de ce site.' })
}
