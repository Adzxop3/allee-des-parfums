// Règles de français communes au client et au serveur

// « de Chanel », mais « d'Azzaro »
export function withDe(name) {
  return /^[aeiouyàâéèêîôû]/i.test(name) ? `d'${name}` : `de ${name}`
}
