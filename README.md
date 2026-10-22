# Parfums

Site d'exploration de parfums (projet de portfolio), basé sur un dataset issu de Fragrantica (usage non commercial).

## Structure

```
client/   Front React (Vite + Tailwind)
server/   API REST Node.js + Express
precompute/ Précalcul de la carte olfactive (Python)
data/     Dataset source
```

## Prérequis

- Node.js 20 ou plus
- PostgreSQL 16
- Python 3.12 (lancé via `py -3.12`, pour la carte olfactive)

## Installation

1. Créer la base de données :

   ```bash
   createdb -U postgres parfums
   ```

2. Configurer la connexion :

   ```bash
   cp server/.env.example server/.env
   ```

   Puis renseigner le mot de passe PostgreSQL dans `server/.env`.

3. Installer les dépendances :

   ```bash
   npm run install:all
   ```

4. Créer les tables (relançable sans risque) :

   ```bash
   npm run migrate
   ```

5. Importer le dataset `data/perfumes.jsonl` (environ 5 minutes, relançable sans doublon) :

   ```bash
   npm run import
   ```

6. Précalculer la carte olfactive et les parfums proches (environ 6 minutes, à relancer après chaque import) :

   ```bash
   npm run map:setup   # une seule fois : crée precompute/.venv et installe les dépendances
   npm run map
   ```

## Lancer le projet

Dans deux terminaux, depuis la racine :

```bash
npm run dev:server   # API sur http://localhost:3001
npm run dev:client   # Site sur http://localhost:5173
```

Le client redirige les appels `/api/...` vers l'API (proxy Vite).

Pour vérifier la connexion : http://localhost:3001/api/health

## API

| Route | Description |
|---|---|
| `GET /api/perfumes?q=&page=&limit=` | Liste paginée (20 par défaut, 100 max), recherche dans le nom du parfum et de la marque |
| `GET /api/perfumes/:id` | Fiche complète : marque, parfumeurs, notes par étage, accords, ambiances |
| `GET /api/perfumes/:id/neighbors?limit=` | Parfums les plus ressemblants (12 au maximum) |
| `GET /api/perfumes/random?near=` | Un parfum au hasard, ou proche des parfums listés dans `near` |
| `GET /api/notes?family=&limit=` | Notes avec leur famille et leur nombre de parfums (`family=none` : non classées) |
| `GET /api/notes/:id` | Une note et les notes qui lui sont le plus souvent associées |
| `GET /api/notes/:id/perfumes?page=&limit=` | Parfums contenant une note, les plus populaires d'abord |
| `GET /api/moods/perfumes?season=&occasion=&mood=&page=` | Parfums par ambiance (au moins 100 votants), triés par score |
| `GET /api/map?limit=` | Points de la carte olfactive (`[id, x, y, famille]`), les plus populaires d'abord |
| `GET /api/stats/families-by-decade` | Parfums par décennie et famille de l'accord principal |
| `GET /api/stats/gender-by-decade` | Parfums par décennie et genre |
| `GET /api/stats/season-accords` | Écart été − hiver des votes, par accord |
| `GET /api/stats/brand-accords` | Accords signatures des 12 marques les plus populaires |

Les statistiques sont calculées au premier appel puis gardées en mémoire : redémarrer le serveur après un import.
