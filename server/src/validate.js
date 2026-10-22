import { z } from 'zod'

// Valide req.body avec un schéma zod.
// Renvoie les données nettoyées, ou envoie une erreur 400 (avec un message par champ) et renvoie null.
export function parseBody(schema, req, res) {
  const result = schema.safeParse(req.body ?? {})
  if (result.success) return result.data

  const { formErrors, fieldErrors } = z.flattenError(result.error)
  const fields = Object.fromEntries(Object.entries(fieldErrors).map(([field, messages]) => [field, messages[0]]))
  // Une erreur qui ne concerne pas un champ précis (ex. « Rien à modifier ») devient le message principal
  res.status(400).json({ error: formErrors[0] ?? 'Certains champs sont invalides.', fields })
  return null
}
