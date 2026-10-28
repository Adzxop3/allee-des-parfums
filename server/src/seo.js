// Référencement et aperçus de liens. Le site est affiché par React dans le navigateur, mais les moteurs
// de recherche et les aperçus de liens (WhatsApp, Discord, LinkedIn…) lisent d'abord le HTML envoyé
// par le serveur : on y insère, pour chaque adresse, le titre, la description, l'image, l'adresse
// canonique et les données structurées (JSON-LD). Le contenu de la page reste affiché par React.
import { withDe } from '../../shared/french.js'
import { cached } from './cache.js'
import { pool } from './db.js'
import { MIN_VOTES_FOR_BEST } from './ratings.js'

const SITE_NAME = 'Allée des parfums'
// Adresse publique du site (sans / final), pour les adresses absolues (canonique, sitemap, Open Graph)
export const SITE_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '')
const DEFAULT_IMAGE = { url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }
const DEFAULT_DESCRIPTION =
  'Explorez 140 000 parfums par nom, marque, notes et ambiances, sur une carte olfactive et en chiffres, ' +
  'et trouvez le vôtre grâce à un questionnaire.'

// Pages fixes : titre (le même que dans le navigateur, voir usePageTitle) et description
const PAGES = {
  '/': { title: null, description: DEFAULT_DESCRIPTION },
  '/notes': {
    title: 'Notes',
    description:
      'Les notes de parfumerie (bergamote, rose, vanille, musc…) classées par famille olfactive, avec les parfums qui les utilisent.',
  },
  '/ambiances': {
    title: 'Ambiances',
    description:
      'Des parfums pour chaque saison, chaque moment de la journée et chaque humeur, d’après les votes de la communauté.',
  },
  '/carte': {
    title: 'Carte olfactive',
    description: 'Une carte où chaque point est un parfum : deux parfums proches ont des accords et des notes semblables.',
  },
  '/chiffres': {
    title: 'Les parfums en chiffres',
    description:
      'Notes les plus utilisées, familles par décennie, accords d’hiver et d’été : ce que racontent 140 000 parfums.',
  },
  '/questionnaire': {
    title: 'Trouver mon parfum',
    description:
      'Quelques questions sur vos goûts (familles, notes, saison, intensité) pour des suggestions de parfums expliquées.',
  },
  '/mentions-legales': { title: 'Mentions légales', description: `Mentions légales du site ${SITE_NAME}.` },
  '/conditions': { title: "Conditions d'utilisation", description: `Conditions d'utilisation du site ${SITE_NAME}.` },
  '/confidentialite': {
    title: 'Politique de confidentialité',
    description: `Données personnelles et cookies sur ${SITE_NAME}.`,
  },
}

// Pages utiles aux membres mais sans intérêt pour un moteur de recherche : non indexées
const PRIVATE_PAGES = {
  '/connexion': 'Connexion',
  '/inscription': 'Créer un compte',
  '/mot-de-passe-oublie': 'Mot de passe oublié',
  '/reinitialiser-mot-de-passe': 'Nouveau mot de passe',
  '/verifier-email': "Confirmation de l'email",
  '/parfumotheque': 'Ma parfumothèque',
  '/compte': 'Mon compte',
  '/admin': 'Modération',
}

const GENDERS = { female: 'pour femme', male: 'pour homme', unisex: 'mixte' }
const MAX_ID = 2147483647 // plus grand entier PostgreSQL (INTEGER)
const fullTitle = (title) => (title ? `${title} · ${SITE_NAME}` : SITE_NAME)
const formatNumber = (n, digits = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: digits })

// Balises de la page demandée : { status, title, description, url, image, noindex, jsonLd, preloadImage }
export async function pageMeta(pathname, query = {}) {
  const url = `${SITE_URL}${pathname}`
  const page = PAGES[pathname]
  if (page) {
    return {
      status: 200,
      title: fullTitle(page.title),
      description: page.description,
      url,
      // Une page de résultats de recherche (?q=) n'est pas une page à indexer
      noindex: pathname === '/' && Boolean(query.q),
      jsonLd: pathname === '/' ? websiteJsonLd() : null,
    }
  }
  if (PRIVATE_PAGES[pathname]) return { status: 200, title: fullTitle(PRIVATE_PAGES[pathname]), url, noindex: true }
  if (/^\/membres\/\d+$/.test(pathname)) return { status: 200, title: fullTitle('Profil'), url, noindex: true }

  const perfume = pathname.match(/^\/perfumes\/(\d+)$/)
  if (perfume) return (await perfumeMeta(Number(perfume[1]), url)) ?? notFound()
  const note = pathname.match(/^\/notes\/(\d+)$/)
  if (note) return (await noteMeta(Number(note[1]), url)) ?? notFound()
  return notFound()
}

function notFound() {
  return { status: 404, title: fullTitle('Page introuvable'), noindex: true }
}

async function perfumeMeta(id, url) {
  if (id > MAX_ID) return null
  const { rows } = await pool.query(
    `SELECT p.name, b.name AS brand, p.year, p.gender, p.image_url, p.rating_avg, p.rating_count,
            (SELECT array_agg(n.name ORDER BY CASE pn.position WHEN 'top' THEN 1 WHEN 'heart' THEN 2 ELSE 3 END,
                                              pn.weight DESC NULLS LAST)
             FROM perfume_notes pn JOIN notes n ON n.id = pn.note_id WHERE pn.perfume_id = p.id) AS notes,
            (SELECT json_build_object('count', count(*), 'average', round(avg(rating)::numeric, 1)::float)
             FROM reviews WHERE perfume_id = p.id AND status = 'published') AS community
     FROM perfumes p LEFT JOIN brands b ON b.id = p.brand_id
     WHERE p.id = $1`,
    [id],
  )
  const p = rows[0]
  if (!p) return null

  // « Coco Mademoiselle de Chanel (2001), parfum pour femme. Notes : Orange, Rose, Patchouli…
  //   Note Fragrantica : 4,1 / 5 sur 33 428 votes. »
  const notes = [...new Set(p.notes ?? [])]
  const intro = `${p.name}${p.brand ? ` ${withDe(p.brand)}` : ''}${p.year ? ` (${p.year})` : ''}`
  const sentences = [
    `${intro}, parfum${GENDERS[p.gender] ? ` ${GENDERS[p.gender]}` : ''}.`,
    notes.length > 0 && `Notes : ${notes.slice(0, 6).join(', ')}${notes.length > 6 ? '…' : '.'}`,
    p.rating_avg && `Note Fragrantica : ${formatNumber(p.rating_avg, 1)} / 5 sur ${formatNumber(p.rating_count)} votes.`,
    p.community.count > 0 && `Avis des membres : ${formatNumber(p.community.average, 1)} / 5 (${p.community.count} avis).`,
  ]

  return {
    status: 200,
    title: fullTitle(`${p.name}${p.brand ? ` (${p.brand})` : ''}`),
    description: sentences.filter(Boolean).join(' '),
    url,
    image: { url: p.image_url, width: 375, height: 500, alt: p.name },
    preloadImage: p.image_url, // la photo est l'élément principal de la page : chargée au plus tôt
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      ...(p.brand && { brand: { '@type': 'Brand', name: p.brand } }),
      category: 'Parfum',
      image: p.image_url,
      url,
      description: sentences[0],
      // Seulement les avis publiés sur ce site (pas les votes Fragrantica, recueillis ailleurs)
      ...(p.community.count > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: p.community.average,
          reviewCount: p.community.count,
          bestRating: 5,
          worstRating: 1,
        },
      }),
    },
  }
}

async function noteMeta(id, url) {
  if (id > MAX_ID) return null
  const { rows } = await pool.query(
    `SELECT n.name, n.perfume_count,
            (SELECT array_agg(o.name ORDER BY a.rank) FROM note_associations a JOIN notes o ON o.id = a.associated_id
             WHERE a.note_id = n.id AND a.rank <= 4) AS associated
     FROM notes n WHERE n.id = $1`,
    [id],
  )
  const n = rows[0]
  if (!n) return null
  return {
    status: 200,
    title: fullTitle(n.name),
    description:
      `${n.name} : note présente dans ${formatNumber(n.perfume_count)} parfum${n.perfume_count > 1 ? 's' : ''}.` +
      (n.associated?.length ? ` Souvent associée à ${n.associated.join(', ')}.` : '') +
      ' Découvrez les parfums qui la contiennent.',
    url,
    noindex: n.perfume_count < 10, // notes trop rares : pages presque vides
  }
}

function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: 'fr',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

// Forme échappée de « < » en JSON : barre oblique inverse suivie de u003c (construite à partir du code 92)
const ESCAPED_LT = `${String.fromCharCode(92)}u003c`
const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => HTML_ENTITIES[c])

// Balises <head> correspondant à pageMeta (texte échappé : les noms viennent du dataset)
export function headTags(meta) {
  const image = meta.image ?? DEFAULT_IMAGE
  const description = meta.description ?? DEFAULT_DESCRIPTION
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  ]
  if (meta.noindex) tags.push('<meta name="robots" content="noindex" />')
  if (meta.url) tags.push(`<link rel="canonical" href="${escapeHtml(meta.url)}" />`)
  if (meta.preloadImage) {
    tags.push(
      `<link rel="preload" as="image" href="${escapeHtml(meta.preloadImage)}" fetchpriority="high" referrerpolicy="no-referrer" />`,
    )
  }
  const openGraph = {
    'og:site_name': SITE_NAME,
    'og:locale': 'fr_FR',
    'og:type': 'website',
    'og:title': meta.title,
    'og:description': description,
    'og:url': meta.url,
    'og:image': image.url,
    'og:image:width': image.width,
    'og:image:height': image.height,
    'og:image:alt': image.alt ?? SITE_NAME,
  }
  for (const [property, content] of Object.entries(openGraph)) {
    if (content) tags.push(`<meta property="${property}" content="${escapeHtml(content)}" />`)
  }
  // Photo de flacon (portrait) : petite carte ; image du site (paysage) : grande carte
  tags.push(`<meta name="twitter:card" content="${meta.image ? 'summary' : 'summary_large_image'}" />`)
  if (meta.jsonLd) {
    // « < » échappé : un nom contenant </script> ne peut pas fermer la balise
    const json = JSON.stringify(meta.jsonLd).replaceAll('<', ESCAPED_LT)
    tags.push(`<script type="application/ld+json">${json}</script>`)
  }
  return tags.join('\n    ')
}

// --- robots.txt et sitemap.xml ---

export function robotsTxt() {
  return [
    'User-agent: *',
    'Disallow: /api/',
    ...Object.keys(PRIVATE_PAGES).map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n')
}

// Plan du site : pages fixes, parfums d'au moins 100 votes, notes d'au moins 10 parfums.
// Moins de 50 000 adresses (limite d'un fichier sitemap). Calculé une fois par démarrage.
export function sitemapXml() {
  return cached('sitemap', async () => {
    const { rows: perfumes } = await pool.query(
      `SELECT id FROM perfumes WHERE rating_count >= ${MIN_VOTES_FOR_BEST} ORDER BY rating_count DESC, id`,
    )
    const { rows: notes } = await pool.query(
      'SELECT id FROM notes WHERE perfume_count >= 10 ORDER BY perfume_count DESC, id',
    )
    const urls = [
      ...Object.keys(PAGES).map((path) => `${SITE_URL}${path}`),
      ...perfumes.map((p) => `${SITE_URL}/perfumes/${p.id}`),
      ...notes.map((n) => `${SITE_URL}/notes/${n.id}`),
    ]
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((loc) => `  <url><loc>${escapeHtml(loc)}</loc></url>`),
      '</urlset>',
      '',
    ].join('\n')
  })
}
