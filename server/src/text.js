import { z } from 'zod'

// Caractères retirés des textes : contrôle (sauf tabulation et saut de ligne), espaces invisibles,
// marques de direction du texte (qui peuvent maquiller un texte), BOM.
// L'expression est construite à partir des codes : le fichier ne contient ainsi aucun caractère invisible.
const INVISIBLE_RANGES = [
  [0x00, 0x08],
  [0x0b, 0x1f],
  [0x7f, 0x9f],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x206f],
  [0xfeff, 0xfeff],
]
const INVISIBLE = new RegExp(
  `[${INVISIBLE_RANGES.map(([from, to]) => `${String.fromCharCode(from)}-${String.fromCharCode(to)}`).join('')}]`,
  'g',
)

// Nettoie un texte saisi par un membre (avis, commentaire...) :
// caractères invisibles retirés, espaces superflus réduits, au plus une ligne vide entre deux paragraphes.
// Le texte reste du texte brut : il n'est jamais interprété comme du HTML (React l'échappe à l'affichage).
export function cleanText(text) {
  return text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(INVISIBLE, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Champ texte zod : nettoyé, puis contrôlé en longueur (après nettoyage)
export function textField(label, min, max) {
  return z
    .string({ error: `${label} requis` })
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(min, { error: `${label} : ${min} caractères minimum` })
        .max(max, { error: `${label} : ${max} caractères maximum` }),
    )
}
