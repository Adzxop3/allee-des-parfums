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
| `POST /api/auth/register` | Inscription `{ email, password, displayName }` (connecte aussitôt) |
| `POST /api/auth/login` | Connexion `{ email, password }` (5 échecs max par compte et 20 par adresse IP en 15 min) |
| `POST /api/auth/logout` | Déconnexion |
| `GET /api/auth/me` | Utilisateur connecté (401 sinon) |
| `POST /api/auth/verify-email` | Confirme l'adresse email `{ token }` (lien envoyé à l'inscription, valable 24 h) |
| `POST /api/auth/resend-verification` | Renvoie l'email de confirmation (3 par heure) |
| `POST /api/auth/forgot-password` | Envoie un lien de réinitialisation `{ email }` (même réponse que le compte existe ou non) |
| `POST /api/auth/reset-password` | Nouveau mot de passe `{ token, password }` (lien valable 1 h, déconnecte toutes les sessions) |
| `DELETE /api/auth/account` | Supprime le compte et toutes ses données `{ password }` (5 essais par 15 min) |
| `GET /api/collection?status=` | Ma parfumothèque (`owned`, `wishlist`, `tested`) et le nombre de parfums par statut — email confirmé requis, comme toutes les routes `/api/collection` |
| `GET /api/collection/summary?status=` | Notes et accords les plus présents dans ma collection |
| `GET /api/collection/recommendations` | Parfums proches de ceux que j'ai notés 4 ou 5 étoiles (hors collection) |
| `GET /api/collection/:perfumeId` | Ce parfum est-il dans ma collection ? |
| `POST /api/collection` | Ajouter `{ perfumeId, status, rating?, personalNote? }` |
| `PATCH /api/collection/:perfumeId` | Modifier `{ status?, rating?, personalNote? }` (note de 1 à 5 ou `null`) |
| `DELETE /api/collection/:perfumeId` | Retirer un parfum |
| `POST /api/recommendations` | Parfums recommandés selon les réponses au questionnaire, avec score et explication (sans compte) |
| `GET /api/recommendations/options` | Exemples de parfums connus pour chaque grande famille |
| `GET` / `PUT /api/recommendations/preferences` | Mes réponses sauvegardées (email confirmé requis) |
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

La connexion repose sur une session stockée en base et un cookie `httpOnly` / `sameSite=Lax` (`secure` quand `NODE_ENV=production`). Les mots de passe sont hachés avec argon2id.

Les emails (confirmation d'adresse, mot de passe oublié) partent par SMTP : renseigner `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` et `APP_URL` dans `server/.env` (voir `.env.example`). **Sans `SMTP_HOST`, les emails sont affichés dans le terminal du serveur**, lien compris : pratique pour tester en local.

Les statistiques et les données du questionnaire sont calculées au premier appel puis gardées en mémoire : redémarrer le serveur après un import.
