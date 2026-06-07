# InvestX — Plan d'Implémentation

## Stack Technologique

| Couche | Technologie | Justification |
|--------|------------|---------------|
| **Frontend** | Next.js 14 (App Router) + TypeScript | SSR, routing intégré, écosystème React riche |
| **Backend** | Node.js + Express + TypeScript | Performance, large écosystème, familier |
| **BDD** | PostgreSQL 16 | `SELECT FOR UPDATE`, `DECIMAL`, transactions ACID |
| **ORM** | Prisma | Typescript natif, migrations faciles, query builder intuitif |
| **Cache** | Redis | Cache des cotations, rate limit API |
| **API Boursière** | Finnhub | WebSocket temps réel + REST gratuit |
| **Auth** | JWT (access + refresh tokens) | Sécurité standard |
| **Charts** | Lightweight Charts (TradingView) | Chandeliers japonais professionnels |

## Phases

- Phase 1 : Installation PostgreSQL + Backend (Express + Prisma + Auth JWT)
- Phase 2 : Frontend (Next.js + Design System + Auth pages)
- Phase 3 : Marché & Trading (Finnhub + Moteur de trading + Chandeliers)
- Phase 4 : Dashboard & Portfolio
- Phase 5 : Fonctionnalités avancées (ordres limites, multi-devises)
- Phase 6 : Bonus (Order Book + NLP)
