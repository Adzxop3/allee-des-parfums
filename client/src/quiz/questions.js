import { MAP_GROUPS } from '../mapGroups.js'

// Réponses par défaut : « peu importe » partout (une question sans réponse ne compte pas dans le score)
export const DEFAULT_ANSWERS = {
  forWhom: 'any',
  families: [],
  likedNotes: [],
  dislikedNotes: [],
  season: 'any',
  time: 'any',
  intensity: 'any',
  popularity: 'any',
  excludeOwned: false,
}

// Les 8 questions, dans l'ordre. type : 'single' (un choix), 'multi' (plusieurs), 'notes' (recherche de notes)
export const QUESTIONS = [
  {
    key: 'forWhom',
    type: 'single',
    title: 'Pour qui cherchez-vous un parfum ?',
    options: [
      { value: 'female', label: 'Pour femme', description: 'Parfums féminins et mixtes' },
      { value: 'male', label: 'Pour homme', description: 'Parfums masculins et mixtes' },
      { value: 'any', label: 'Peu importe' },
    ],
  },
  {
    key: 'families',
    type: 'multi',
    max: 3,
    title: 'Quelles familles vous attirent ?',
    help: "Jusqu'à 3 choix. Vous pouvez aussi passer cette question.",
    // Les exemples de parfums connus sont ajoutés par l'API (/api/recommendations/options)
    options: MAP_GROUPS.filter((group) => group.key !== 'other').map((group) => ({
      value: group.key,
      label: group.label,
      color: group.color,
    })),
  },
  {
    key: 'likedNotes',
    type: 'notes',
    max: 5,
    title: 'Des notes que vous aimez ?',
    help: "Jusqu'à 5 notes, facultatif. Les noms des notes sont en anglais, comme sur Fragrantica.",
  },
  {
    key: 'dislikedNotes',
    type: 'notes',
    max: 5,
    title: 'Des notes que vous voulez éviter ?',
    help: "Jusqu'à 5 notes, facultatif. Un parfum où elles dominent ne sera pas proposé.",
  },
  {
    key: 'season',
    type: 'single',
    title: 'Pour quelle saison ?',
    options: [
      { value: 'winter', label: 'Hiver' },
      { value: 'spring', label: 'Printemps' },
      { value: 'summer', label: 'Été' },
      { value: 'autumn', label: 'Automne' },
      { value: 'any', label: "Toute l'année" },
    ],
  },
  {
    key: 'time',
    type: 'single',
    title: 'Plutôt le jour ou le soir ?',
    options: [
      { value: 'day', label: 'En journée' },
      { value: 'night', label: 'Le soir' },
      { value: 'any', label: 'Les deux' },
    ],
  },
  {
    key: 'intensity',
    type: 'single',
    title: 'Quelle intensité ?',
    help: "D'après la tenue et le sillage votés par la communauté.",
    options: [
      { value: 'light', label: 'Discret', description: 'Reste près de la peau' },
      { value: 'moderate', label: 'Modéré', description: 'Se remarque sans envahir' },
      { value: 'strong', label: 'Puissant', description: 'Sillage marqué, longue tenue' },
      { value: 'any', label: 'Peu importe' },
    ],
  },
  {
    key: 'popularity',
    type: 'single',
    title: 'Grands classiques ou découvertes ?',
    options: [
      { value: 'classic', label: 'Des grands classiques', description: 'Parfums très connus et très votés' },
      { value: 'discovery', label: 'Des pépites moins connues', description: 'Pour sortir des sentiers battus' },
      { value: 'any', label: 'Peu importe' },
    ],
  },
]
