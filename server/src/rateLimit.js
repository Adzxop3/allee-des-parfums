import { ipKeyGenerator, rateLimit } from 'express-rate-limit'

// Limitation de fréquence avec un message clair en français (réponse 429).
// Les compteurs sont en mémoire : ils repartent de zéro au redémarrage du serveur, ce qui suffit
// pour un seul serveur (avec plusieurs serveurs, il faudrait un stockage partagé comme Redis).
// skipSuccessfulRequests : seuls les échecs comptent (tentatives de connexion) ;
// skipFailedRequests : seules les réussites comptent (publications), une erreur de saisie ne pénalise pas
export function limiter({
  minutes,
  limit,
  message,
  keyGenerator,
  skipSuccessfulRequests = false,
  skipFailedRequests = false,
}) {
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    keyGenerator,
    skipSuccessfulRequests,
    skipFailedRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      const wait = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 60000))
      res.status(429).json({ error: `${message} Réessayez dans ${wait} min.` })
    },
  })
}

// Clé par membre connecté (les routes concernées exigent une connexion), sinon par adresse IP
export const perUser = (req) => (req.user ? `user-${req.user.id}` : ipKeyGenerator(req.ip))
