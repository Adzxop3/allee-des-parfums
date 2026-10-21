# Parfums

Site d'exploration de parfums (projet de portfolio), basé sur un dataset issu de Fragrantica (usage non commercial).

## Structure

```
client/   Front React (Vite + Tailwind)
server/   API REST Node.js + Express
data/     Dataset source
```

## Prérequis

- Node.js 20 ou plus
- PostgreSQL 16

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

5. Importer le dataset `data/perfumes.jsonl` (environ 2 minutes, relançable sans doublon) :

   ```bash
   npm run import
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
| `GET /api/notes` | Toutes les notes avec leur nombre de parfums |
| `GET /api/notes/:id/perfumes?page=&limit=` | Parfums contenant une note (avec l'étage : `top`, `heart`, `base` ou `flat`) |
