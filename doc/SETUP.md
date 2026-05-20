# 📚 Projet Alternative - Setup Initial

## ✅ Fait

### Initialisation du projet
- [x] Next.js 16 créé
- [x] Structure `src/` mise en place
- [x] Dépendances installées

### Configuration
- [x] Drizzle ORM configuré (`drizzle.config.ts`)
- [x] Vitest configuré (`vitest.config.ts`)
- [x] TypeScript configuré avec alias `@/*`
- [x] `.env.local` créé (à compléter)

### Schémas & Validation
- [x] Schéma BDD complet (`src/db/schema.ts`)
  - `users` (avec role admin/user)
  - `manuscripts` (soumissions)
  - `publications` (écrits acceptés)
  - `comments` (visibles par défaut)
  - `ratings` (système de notation 1-5)
  - `reports` (signalement de commentaires par lecteurs)
  - `notifications` (in-app pour auteurs)
- [x] Schémas Zod créés (`src/lib/validation.ts`)
  - Signup, signin
  - Manuscript submission
  - Comments, ratings, reports

### Services externes
- [x] Resend installé (pour emails)
- [x] Clé RESEND_API_KEY ajoutée dans `.env.local`
- [x] Emails transactionnels implémentés (bienvenue, acceptation, refus)

### Scripts disponibles
```bash
npm run dev              # Lancer le dev server
npm run build            # Build production
npm start                # Lancer en prod
npm run lint             # Lancer ESLint
npm run db:generate     # Générer les migrations
npm run db:migrate      # Appliquer les migrations
npm run db:push         # Push le schéma à la BDD
npm test                # Lancer les tests
npm run test:ui         # Lancer les tests avec UI
```

---

## ✅ Tout est en place

### Fonctionnalités complètes
- [x] BDD PostgreSQL Neon + migrations Drizzle
- [x] Better Auth (signup / signin / signout)
- [x] Homepage, pages auth, soumission, admin, dashboard perso
- [x] Acceptance/rejet + publications publiques
- [x] Commentaires, notation, signalements
- [x] Emails transactionnels (Resend)
- [x] Notifications in-app
- [x] Mode sombre
- [x] Tests Vitest + GitHub Actions CI
- [x] Déployé sur Vercel

### Reste à faire
- [ ] Recherche & filtres
- [ ] Gestion d'erreurs centralisée (`errors.ts` + `error.tsx`)

---

## 📖 Ressources

- Better Auth : http://better-auth.com/
- Drizzle ORM : https://orm.drizzle.team/
- Zod : https://zod.dev/
- Resend : https://resend.com/docs
