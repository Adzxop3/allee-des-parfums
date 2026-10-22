// Humeurs déduites des accords (le dataset n'en fournit pas).
// Pour chaque humeur : poids (0 à 1) des accords qui l'évoquent.
// Score d'un parfum = somme(poids × intensité de l'accord) / somme des intensités de ses accords.
export const MOOD_ACCORDS = {
  energizing: {
    citrus: 1, fresh: 1, aquatic: 1, marine: 1, ozonic: 1, 'fresh spicy': 0.7, green: 0.6,
    aromatic: 0.6, mineral: 0.5, salty: 0.5, fruity: 0.3,
  },
  sensual: {
    amber: 1, animalic: 1, musky: 0.8, tuberose: 0.8, 'warm spicy': 0.7, balsamic: 0.7, oud: 0.7,
    vanilla: 0.6, leather: 0.6, 'white floral': 0.5, patchouli: 0.5,
  },
  cozy: {
    vanilla: 1, caramel: 1, lactonic: 1, milky: 1, cacao: 1, chocolate: 1, gourmand: 1, sweet: 0.8,
    honey: 0.8, almond: 0.8, nutty: 0.8, coffee: 0.8, powdery: 0.6, coconut: 0.6, cinnamon: 0.6,
  },
  romantic: {
    rose: 1, floral: 0.8, violet: 0.8, 'white floral': 0.6, 'yellow floral': 0.6, iris: 0.6,
    powdery: 0.5, tuberose: 0.5, fruity: 0.4,
  },
  elegant: {
    iris: 1, aldehydic: 1, powdery: 0.8, mossy: 0.8, leather: 0.6, woody: 0.5, violet: 0.5, soapy: 0.5,
  },
  mysterious: {
    oud: 1, smoky: 1, tobacco: 0.9, leather: 0.8, balsamic: 0.7, earthy: 0.6, animalic: 0.6,
    patchouli: 0.6, 'warm spicy': 0.5, amber: 0.4,
  },
  joyful: { fruity: 1, tropical: 1, cherry: 0.8, citrus: 0.6, sweet: 0.5 },
  natural: {
    green: 1, herbal: 1, conifer: 1, woody: 0.6, earthy: 0.6, mossy: 0.6, lavender: 0.6, aromatic: 0.5,
  },
}
