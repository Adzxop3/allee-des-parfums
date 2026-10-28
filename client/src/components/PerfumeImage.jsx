// Photo d'un parfum (hébergée par Fragrantica).
// width / height réservent la place avant le chargement : la page ne saute pas quand l'image arrive.
// small : variante 125 × 140 (environ 4 Ko au lieu de 20) pour les vignettes.
// priority : image visible dès l'arrivée sur la page (chargée tout de suite, en priorité).
export default function PerfumeImage({ src, alt = '', small = false, priority = false, className = '' }) {
  const [width, height] = small ? [125, 140] : [375, 500]
  return (
    <img
      src={small ? src.replace('/375x500.', '/s.') : src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
    />
  )
}
