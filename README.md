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

- Node.js 22.9 ou plus
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

7. Nommer un modérateur (le compte doit déjà exister ; `--remove` pour retirer le rôle) :

   ```bash
   npm run make-admin -- email@exemple.com
   ```

## Lancer le projet

Dans deux terminaux, depuis la racine :

```bash
npm run dev:server   # API sur http://localhost:3001
npm run dev:client   # Site sur http://localhost:5173
```

Le client redirige les appels `/api/...` vers l'API (proxy Vite).

Pour vérifier la connexion : http://localhost:3001/api/health

## Mise en ligne

### Architecture

- **Render** (service web Node) : l'API Express sert aussi le site React compilé (`client/dist`). Site et API ont donc la même adresse, comme en développement.
- **Neon** (PostgreSQL, 1 Go gratuit) : la base pèse environ 533 Mo une fois restaurée.
- **Brevo** (SMTP, 300 emails/jour gratuits) : emails de confirmation et de mot de passe oublié, **indispensables** (publier exige un email confirmé).

L'import du dataset (4 Go de mémoire) et le calcul de la carte (Python) restent des tâches **locales** : on envoie en production une base déjà prête.

Limites des offres gratuites : le service Render se met en veille après 15 min sans visite (environ 1 min pour se réveiller) et dispose de 512 Mo de mémoire (le serveur en utilise environ 325 Mo une fois ses caches remplis).

### Procédure

1. **Neon** : créer un projet (PostgreSQL 16, région Europe, par ex. Francfort). Copier l'adresse de connexion (`postgresql://…?sslmode=require`).
2. **Envoyer le catalogue** (sans aucun compte, session ni avis de la base locale), depuis la racine du projet en local :

   ```bash
   npm run db:backup -- --catalog-only
   ```

   Puis, dans PowerShell, en remplaçant l'adresse et le nom du fichier créé :

   ```powershell
   $env:DATABASE_URL = "postgresql://...neon.tech/neondb?sslmode=require"
   npm run db:restore -- data/backups/parfums-catalogue-AAAA-MM-JJ-HH-MM.dump --yes
   npm run migrate
   Remove-Item Env:DATABASE_URL
   ```

3. **Brevo** : créer un compte, une clé SMTP, et valider l'adresse d'expédition.
4. **Render** : « New Web Service » depuis le dépôt GitHub, région Europe (Francfort), puis :
   - Build command : `npm run build`
   - Start command : `npm start`
   - Health check path : `/api/health`
   - Variables d'environnement : `NODE_ENV=production`, `TRUST_PROXY=1`, `DATABASE_URL` (Neon), `APP_URL` (l'adresse Render, par ex. `https://allee-des-parfums.onrender.com`), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
5. **Vérifier** : ouvrir `https://…/api/health` (`"database": "ok"`), parcourir le site, créer un compte et vérifier la réception de l'email de confirmation.
6. **Premier modérateur** : avec le compte créé et confirmé sur le site en ligne, en local :

   ```powershell
   $env:DATABASE_URL = "postgresql://...neon.tech/neondb?sslmode=require"
   npm run make-admin -- votre@email.com
   Remove-Item Env:DATABASE_URL
   ```

7. **Mises à jour** : chaque `git push` sur `main` redéploie le site sur Render. Si une nouvelle migration existe, lancer `npm run migrate` avec `DATABASE_URL` comme ci-dessus.

### Sauvegardes

`npm run db:backup` crée une sauvegarde dans `data/backups/` (dossier exclu de git) : de la base locale, ou de la production si `DATABASE_URL` est défini. À faire régulièrement et avant toute modification importante (l'offre gratuite de Neon a une restauration limitée). `npm run db:restore -- fichier.dump --yes` remplace le contenu de la base `DATABASE_URL` (jamais la base locale par défaut).

### À vérifier avant publication

- **Licence du dataset** : conditions de la source (usage non commercial, attribution) et réutilisation des images hébergées sur fimgs.net ; les conditions d'utilisation de Fragrantica elles-mêmes peuvent restreindre la réutilisation de leurs données.
- **Pages légales** : compléter les passages surlignés de `/mentions-legales`, `/conditions` et `/confidentialite` (éditeur, hébergeurs Render et Neon, Brevo, durée du journal de modération).
- **Secrets** : uniquement dans les tableaux de bord Render et Neon, jamais dans le code ; `server/.env` reste exclu de git.
- **Sauvegardes** : une première sauvegarde de la production juste après la mise en ligne.
- **Emails** : SMTP configuré et testé (sans lui, personne ne peut confirmer son compte ni publier).

## API

| Route | Description |
|---|---|
| `POST /api/auth/register` | Inscription `{ email, password, displayName }` (connecte aussitôt) |
| `POST /api/auth/login` | Connexion `{ email, password }` (5 échecs max par compte et 20 par adresse IP en 15 min) |
| `POST /api/auth/logout` | Déconnexion |
| `GET /api/auth/me` | Utilisateur connecté (`{ user: null }` pour un visiteur) |
| `POST /api/auth/verify-email` | Confirme l'adresse email `{ token }` (lien envoyé à l'inscription, valable 24 h) |
| `POST /api/auth/resend-verification` | Renvoie l'email de confirmation (3 par heure) |
| `POST /api/auth/forgot-password` | Envoie un lien de réinitialisation `{ email }` (même réponse que le compte existe ou non) |
| `POST /api/auth/reset-password` | Nouveau mot de passe `{ token, password }` (lien valable 1 h, déconnecte toutes les sessions) |
| `PATCH /api/auth/settings` | Confidentialité `{ showFavorites }` (favoris visibles sur le profil public) |
| `GET /api/members/:id` | Profil public : pseudo, date d'inscription, nombre d'avis, favoris si rendus publics |
| `GET /api/members/:id/reviews?page=` | Avis publiés d'un membre |
| `DELETE /api/auth/account` | Supprime le compte et toutes ses données `{ password }` (5 essais par 15 min) |
| `GET /api/collection?status=` | Ma parfumothèque (`owned`, `wishlist`, `tested`) et le nombre de parfums par statut — email confirmé requis, comme toutes les routes `/api/collection` |
| `GET /api/collection/summary?status=` | Notes et accords les plus présents dans ma collection |
| `GET /api/collection/recommendations` | Parfums proches de ceux que j'ai notés 4 ou 5 étoiles (hors collection) |
| `GET /api/collection/:perfumeId` | Ce parfum est-il dans ma collection ? |
| `POST /api/collection` | Ajouter `{ perfumeId, status, rating?, personalNote? }` |
| `PATCH /api/collection/:perfumeId` | Modifier `{ status?, rating?, personalNote? }` (note de 1 à 5 ou `null`) |
| `DELETE /api/collection/:perfumeId` | Retirer un parfum |
| `POST /api/recommendations` | Parfums recommandés selon les réponses au questionnaire, avec score et explication (sans compte) |
| `GET /api/perfumes/:id/reviews?page=&sort=recent\|useful` | Avis publiés d'un parfum (10 par page), note moyenne, nombre d'avis, votes « utile » et nombre de commentaires |
| `GET /api/perfumes/:id/reviews/mine` | Mon avis sur ce parfum (même masqué) |
| `POST /api/perfumes/:id/reviews` | Publier un avis `{ rating, title, body }` (email confirmé, un avis par parfum) |
| `PATCH` / `DELETE /api/reviews/:id` | Modifier ou supprimer **son** avis |
| `POST` / `DELETE /api/reviews/:id/vote` | Voter « utile » / retirer son vote (pas sur son propre avis) |
| `GET /api/reviews/:id/comments` | Commentaires d'un avis |
| `POST /api/reviews/:id/comments` | Répondre à un avis `{ body }` (email confirmé) |
| `DELETE /api/comments/:id` | Supprimer **son** commentaire |
| `POST /api/reports` | Signaler un avis ou un commentaire `{ targetType, targetId, reason, details? }` |
| `GET /api/admin/reports` | Signalements en attente, regroupés par contenu (admin) |
| `POST /api/admin/moderate` | Décision `{ targetType, targetId, action: hide\|delete\|ignore, note? }` (admin) |
| `GET /api/admin/log?page=` | Journal des décisions de modération (admin) |
| `GET /api/recommendations/options` | Exemples de parfums connus pour chaque grande famille |
| `GET` / `PUT /api/recommendations/preferences` | Mes réponses sauvegardées (email confirmé requis) |
| `GET /api/perfumes?q=&page=&limit=&sort=name\|rating` | Liste paginée (20 par défaut, 100 max), recherche dans le nom du parfum et de la marque ; `sort=rating` : les mieux notés (au moins 100 votes) |
| `GET /api/perfumes/:id` | Fiche complète : marque, parfumeurs, notes par étage, accords, ambiances |
| `GET /api/perfumes/:id/neighbors?limit=` | Parfums les plus ressemblants (12 au maximum) |
| `GET /api/perfumes/random?near=` | Un parfum au hasard, ou proche des parfums listés dans `near` |
| `GET /api/notes?family=&limit=` | Notes avec leur famille et leur nombre de parfums (`family=none` : non classées) |
| `GET /api/notes/:id` | Une note et les notes qui lui sont le plus souvent associées |
| `GET /api/notes/:id/perfumes?page=&limit=&sort=popular\|rating` | Parfums contenant une note, les plus populaires ou les mieux notés |
| `GET /api/moods/perfumes?season=&occasion=&mood=&minRating=&page=` | Parfums par ambiance (au moins 100 votants), triés par score ; `minRating=4` : bien notés seulement |
| `GET /api/map?limit=` | Points de la carte olfactive (`[id, x, y, famille]`), les plus populaires d'abord |
| `GET /api/stats/families-by-decade` | Parfums par décennie et famille de l'accord principal |
| `GET /api/stats/gender-by-decade` | Parfums par décennie et genre |
| `GET /api/stats/season-accords` | Écart été − hiver des votes, par accord |
| `GET /api/stats/brand-accords` | Accords signatures des 12 marques les plus populaires |

La connexion repose sur une session stockée en base et un cookie `httpOnly` / `sameSite=Lax` (`secure` quand `NODE_ENV=production`). Les mots de passe sont hachés avec argon2id.

Communauté (avis, commentaires, votes, signalements) : publication réservée aux comptes à l'email confirmé. Anti-spam :

| Action | Limite par membre | Contrôles |
|---|---|---|
| Publier un avis | 5 par heure | longueurs, 2 liens maximum, pas de caractère ou de mot répété en boucle, pas de texte déjà publié |
| Modifier un avis | 20 par heure | idem |
| Commenter | 10 par 10 minutes | idem |
| Signaler | 10 par heure | motif dans une liste fixe, 500 caractères maximum |

« Déjà publié » : même texte (sans tenir compte de la casse, des accents ni de la ponctuation) publié par le membre dans les 30 derniers jours, ou par un autre membre dans les 24 dernières heures (sauf textes très courts). Seules les publications acceptées comptent dans les limites.

Les emails (confirmation d'adresse, mot de passe oublié) partent par SMTP : renseigner `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` et `APP_URL` dans `server/.env` (voir `.env.example`). **Sans `SMTP_HOST`, les emails sont affichés dans le terminal du serveur**, lien compris : pratique pour tester en local.

Les statistiques et les données du questionnaire sont calculées au premier appel puis gardées en mémoire : redémarrer le serveur après un import.
