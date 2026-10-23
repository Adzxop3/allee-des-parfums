import { pool } from './db.js'

// Détection simple du spam dans les avis et commentaires (après le nettoyage de text.js).

const MAX_LINKS = 2

// Renvoie un message d'erreur si le texte ressemble à du spam, sinon null
export function spamProblem(text) {
  const links = text.match(/https?:\/\/|www\./gi) ?? []
  if (links.length > MAX_LINKS) return `${MAX_LINKS} liens au maximum`

  // Un même caractère répété 10 fois de suite (« !!!!!!!!!! », « aaaaaaaaaa »)
  if (/(.)\1{9,}/u.test(text)) return 'Évitez de répéter un même caractère'

  // Un même mot qui fait plus de la moitié du texte (« achetez achetez achetez… »)
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? []
  if (words.length >= 6) {
    const counts = new Map()
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1)
    if (Math.max(...counts.values()) > words.length / 2) return 'Évitez de répéter un même mot'
  }
  return null
}

// Empreinte d'un texte : minuscules, sans accents, sans espaces ni ponctuation.
// Deux textes qui ne diffèrent que par la casse ou la ponctuation ont la même empreinte.
export function fingerprint(text) {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, '')
}

const MIN_SHARED_LENGTH = 20 // en dessous (« Merci ! », « D'accord »), un texte identique n'est pas suspect

// Texte déjà publié ? Par le même membre (30 derniers jours) ou par un autre (24 dernières heures).
// table : 'reviews' | 'comments' (liste fixe) ; excludeId : l'avis en cours de modification
export async function isRepeated(table, userId, text, excludeId = null) {
  if (!['reviews', 'comments'].includes(table)) throw new Error(`Table inconnue : ${table}`)
  const print = fingerprint(text)
  const { rows } = await pool.query(
    `SELECT user_id, body FROM ${table}
     WHERE id IS DISTINCT FROM $3
       AND ((user_id = $1 AND created_at > now() - interval '30 days')
         OR (user_id <> $1 AND created_at > now() - interval '24 hours' AND char_length(body) >= $2))
     ORDER BY created_at DESC
     LIMIT 500`,
    [userId, MIN_SHARED_LENGTH, excludeId],
  )
  return rows.some(
    (row) =>
      fingerprint(row.body) === print && (row.user_id === userId || print.length >= MIN_SHARED_LENGTH),
  )
}
