# InvestX

InvestX est une application web de trading pédagogique avec un tableau de bord complet, un graphique TradingView, un terminal d'achat/vente, un carnet d'ordres, un portefeuille, un historique de transactions, des alertes et un classement.

Le projet est composé de deux applications:

- `backend/`: API REST Express + TypeScript, Prisma, PostgreSQL, WebSocket de marché.
- `frontend/`: interface Next.js + React, dashboard, TradingView, terminal de trading.

## Fonctionnalités principales

- Authentification par email/mot de passe avec access token et refresh token.
- Dashboard trading avec graphique TradingView en temps réel.
- Sélecteur de marché depuis la barre supérieure.
- Terminal Buy/Sell avec ordres Market et Limit.
- Carnet d'ordres et ordres en attente.
- Portefeuille, positions ouvertes et historique.
- Alertes de prix.
- Classement des utilisateurs.
- Préférence de devise utilisateur.
- Données de marché via Finnhub si une clé API est fournie, avec fallback/mock en développement.

## Prérequis

Avant de commencer, installez:

- Node.js 20 ou plus récent
- npm
- Git
- PostgreSQL, en local ou via un service cloud

Vérifiez les versions:

```bash
node --version
npm --version
git --version
```

## Installation

Clonez le dépôt:

```bash
git clone https://github.com/Ninamou627/Invext.git
cd Invext
```

Préparez les fichiers d'environnement avant l'installation:

```bash
cd backend
copy .env.example .env
cd ../frontend
copy .env.example .env
```

Sur macOS/Linux:

```bash
cd backend
cp .env.example .env
cd ../frontend
cp .env.example .env
```

Installez les dépendances:

```bash
cd backend
npm install
cd ../frontend
npm install
```

## Configuration des variables d'environnement

Les fichiers `.env` ne doivent jamais être commités. Utilisez les fichiers d'exemple fournis.

Backend, fichier `backend/.env`:

```bash
cp .env.example .env
```

Modifiez ensuite `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_REFRESH_SECRET="replace-with-another-long-random-secret"
FINNHUB_API_KEY=""
PORT=5005
NODE_ENV=development
```

Notes:

- `DATABASE_URL` doit pointer vers votre base PostgreSQL.
- `JWT_SECRET` et `JWT_REFRESH_SECRET` doivent être longs et différents.
- `FINNHUB_API_KEY` est optionnel en développement. Sans clé, le backend utilise des données simulées ou des fallbacks selon les routes.
- Le backend démarre par défaut sur `http://localhost:5005`.

Frontend, fichier `frontend/.env`:

```env
NEXT_PUBLIC_API_URL="http://localhost:5005/api"
```

## Base de données

Depuis le dossier `backend`, générez le client Prisma:

```bash
npx prisma generate
```

Appliquez les migrations en développement:

```bash
npx prisma migrate dev
```

Pour une base de production ou une base cloud déjà prête:

```bash
npx prisma migrate deploy
```

Vous pouvez aussi ouvrir Prisma Studio:

```bash
npx prisma studio
```

## Démarrage en développement

Ouvrez deux terminaux.

Terminal 1, backend:

```bash
cd backend
npm run dev
```

Le backend doit afficher une URL du type:

```text
http://localhost:5005
```

Vérifiez l'API:

```bash
http://localhost:5005/health
```

Terminal 2, frontend:

```bash
cd frontend
npm run dev
```

Ouvrez ensuite:

```text
http://localhost:3000
```

## Scripts disponibles

Backend:

```bash
npm run dev      # lance Express en développement avec nodemon/ts-node
npm run build    # compile TypeScript vers dist/
npm run start    # lance la version compilée
npm run prepare  # génère le client Prisma
```

Frontend:

```bash
npm run dev      # lance Next.js en développement
npm run build    # compile l'application Next.js
npm run start    # lance la version production
npm run lint     # lance ESLint
```

## Structure du projet

```text
Invext/
  backend/
    prisma/
      schema.prisma
      migrations/
    src/
      controllers/
      routes/
      services/
      middleware/
      validators/
      utils/
    package.json
  frontend/
    src/
      app/
      components/
      context/
      lib/
    package.json
  README.md
```

## Utilisation

1. Créez un compte depuis la page Register.
2. Connectez-vous depuis la page Login.
3. Ouvrez le dashboard.
4. Choisissez un marché dans la barre de recherche du haut, par exemple `BINANCE:BTCUSDT`, `BINANCE:ETHUSDT`, `BINANCE:SOLUSDT`, `AAPL`, `MSFT` ou `TSLA`.
5. Consultez le graphique TradingView.
6. Placez un ordre depuis le terminal Buy/Sell.
7. Suivez les positions, l'historique, les alertes et le classement.

## Données de marché

Le backend peut utiliser Finnhub pour les prix et le WebSocket de marché.

Pour activer Finnhub:

1. Créez une clé API Finnhub.
2. Ajoutez-la dans `backend/.env`:

```env
FINNHUB_API_KEY="votre-cle-finnhub"
```

Sans clé API, l'application reste utilisable en développement avec des données simulées/fallback.

## Dépannage

Si le frontend ne peut pas contacter l'API:

- Vérifiez que le backend tourne sur `http://localhost:5005`.
- Vérifiez `frontend/.env`.
- Vérifiez que `NEXT_PUBLIC_API_URL` vaut `http://localhost:5005/api`.

Si Prisma ne trouve pas la base:

- Vérifiez `DATABASE_URL`.
- Vérifiez que PostgreSQL est démarré.
- Relancez `npx prisma generate`.
- Relancez `npx prisma migrate dev`.

Si le dashboard redirige vers Login:

- Connectez-vous avec un utilisateur valide.
- Vérifiez que les tokens sont présents dans le navigateur.
- Vérifiez que le backend accepte les requêtes depuis `http://localhost:3000`.

Si les prix ne bougent pas:

- Sans clé Finnhub, le mode mock génère des ticks seulement pour les symboles actifs.
- Vérifiez que le backend WebSocket tourne sur le même port que l'API.
- Rechargez le dashboard après avoir démarré le backend.

## Sécurité

Ne commitez jamais:

- `backend/.env`
- `frontend/.env`
- une URL de base de données privée
- des secrets JWT
- des clés API
- `node_modules/`
- les builds `.next/` ou `dist/`

## Build de production

Backend:

```bash
cd backend
npm run build
npm run start
```

Frontend:

```bash
cd frontend
npm run build
npm run start
```

En production, configurez les variables d'environnement sur la plateforme d'hébergement au lieu d'utiliser des fichiers `.env` locaux.

## Deploiement du frontend sur Render en Static Site

Le frontend est configure en export statique Next.js avec `output: "export"`. Apres `npm run build`, Next genere le dossier `frontend/out`, que Render peut publier comme Static Site.

Configuration recommandee pour le service frontend sur Render:

```text
Service Type: Static Site
Root Directory: frontend
Build Command: npm ci && npm run build
Publish Directory: out
```

Variables d'environnement a ajouter dans Render:

```env
NODE_VERSION=20.18.0
NEXT_PUBLIC_API_URL=https://URL-DU-BACKEND-RENDER/api
NEXT_PUBLIC_WS_URL=wss://URL-DU-BACKEND-RENDER
```

L'erreur `Publish directory dist does not exist` signifie que Render cherche `dist`, alors que ce projet genere `out`.

Important: en export statique, les routes dynamiques doivent etre connues au build. La page `/dashboard/assets/[symbol]` genere donc les marches principaux (`BINANCE:BTCUSDT`, `BINANCE:ETHUSDT`, `BINANCE:SOLUSDT`, `AAPL`, `MSFT`, etc.). Les autres marches restent utilisables depuis le dashboard principal via le graphique et le terminal, mais une URL directe `/dashboard/assets/...` inconnue ne sera pas creee automatiquement en mode Static Site.
