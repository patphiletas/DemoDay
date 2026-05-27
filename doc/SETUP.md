# 📚 Projet AlterNative - Setup

## ✅ Fait

### Initialisation du projet
- [x] Next.js 16 créé
- [x] Structure `src/` mise en place
- [x] Dépendances installées

### Configuration
- [x] Drizzle ORM configuré (`drizzle.config.ts`)
- [x] Vitest configuré (`vitest.config.ts`)
- [x] TypeScript configuré avec alias `@/*`
- [x] `.env.local` créé et rempli

### Schémas & Validation
- [x] Schéma BDD complet (`src/db/schema.ts`)
  - `users` (avec role admin/user)
  - `manuscripts` (soumissions)
  - `publications` (écrits acceptés, `coverImageUrl`)
  - `comments` (soft delete, modération)
  - `ratings` (notation 1-5, contrainte UNIQUE par user/publication)
  - `reports` (signalement de commentaires)
  - `notifications` (in-app pour auteurs)
- [x] Schémas Zod créés (`src/lib/validation.ts`)
  - Signup, signin
  - Manuscript submission
  - Comments, ratings, reports

### Services externes
- [x] Resend installé (emails transactionnels)
- [x] Cloudinary installé v2 (upload de couvertures)

### Scripts disponibles
```bash
npm run dev              # Lancer le dev server
npm run build            # Build production
npm start                # Lancer en prod
npm run lint             # Lancer ESLint
npm run db:generate      # Générer les migrations
npm run db:migrate       # Appliquer les migrations
npm run db:push          # Push le schéma à la BDD
npm test                 # Lancer les tests
npm run test:ui          # Lancer les tests avec UI
```

---

## Variables d'environnement

**`.env.local`**
```env
# Base de données
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=your_secret
BETTER_AUTH_URL=http://localhost:3000

# URL publique (utilisée dans les liens emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Emails transactionnels
RESEND_API_KEY=your_resend_key

# Upload d'images de couverture
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> Ces mêmes variables doivent être ajoutées dans Vercel → Settings → Environment Variables pour la production.

---

## Fonctionnalités complètes
- [x] BDD PostgreSQL Neon + migrations Drizzle
- [x] Better Auth (signup / signin / signout)
- [x] Homepage, pages auth, soumission, admin, dashboard perso
- [x] Barre de recherche (ILIKE, URL partageable)
- [x] Acceptance/rejet + publications publiques
- [x] Upload couverture via Cloudinary ou URL externe
- [x] Navigation précédent/suivant avec défilement infini
- [x] Commentaires, notation (upsert), rate limiting
- [x] Emails transactionnels (Resend)
- [x] Notifications in-app
- [x] Mode sombre
- [x] Tests Vitest + GitHub Actions CI
- [x] Déployé sur Vercel

## Reste à faire
- [ ] Middleware global Next.js pour protéger les routes
- [ ] Gestion d'erreurs centralisée (`errors.ts` + `error.tsx`)
- [ ] Interface utilisateur pour les notifications

---

## 📖 Ressources

- Better Auth : http://better-auth.com/
- Drizzle ORM : https://orm.drizzle.team/
- Zod : https://zod.dev/
- Resend : https://resend.com/docs
- Cloudinary : https://cloudinary.com/documentation/node_integration
