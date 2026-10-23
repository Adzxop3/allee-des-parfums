// Notes des parfums, à utiliser dans les requêtes où la table perfumes a l'alias « p ».
//  - note Fragrantica : p.rating_avg sur p.rating_count votes (dataset)
//  - avis des membres : moyenne des avis publiés sur le site
//  - note combinée : les avis des membres comptent comme des votes de plus, à côté de ceux de Fragrantica

// Jointure des avis publiés, agrégés par parfum (alias « cr »)
export const COMMUNITY_JOIN = `LEFT JOIN (
    SELECT perfume_id, count(*) AS n, sum(rating) AS total
    FROM reviews WHERE status = 'published' GROUP BY perfume_id
  ) cr ON cr.perfume_id = p.id`

// Note combinée de 1 à 5 (NULL sans aucun vote)
export const COMBINED_RATING = `((coalesce(p.rating_avg, 0) * p.rating_count + coalesce(cr.total, 0))
  / nullif(p.rating_count + coalesce(cr.n, 0), 0))`

// Colonnes renvoyées au front pour afficher les deux notes
export const RATING_COLUMNS = `p.rating_avg AS "ratingAvg", p.rating_count AS "ratingCount",
  round(cr.total::numeric / cr.n, 1)::float AS "communityAvg", coalesce(cr.n, 0)::int AS "communityCount"`

// « Les mieux notés » ne concerne que les parfums assez votés (sinon un seul 5/5 passerait devant tout)
export const MIN_VOTES_FOR_BEST = 100
