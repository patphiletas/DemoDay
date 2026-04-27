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
- [ ] Clé RESEND_API_KEY à ajouter dans `.env.local`

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

## ❌ À faire

### 1. Configuration BDD
- [ ] Créer une BDD PostgreSQL (Neon)
- [ ] Mettre à jour `DATABASE_URL` dans `.env.local`
- [ ] Générer et appliquer les migrations
  ```bash
  npm run db:generate
  npm run db:migrate
  ```

### 2. Better Auth
- [ ] Créer `src/lib/auth.ts` et configurer Better Auth
- [ ] Implémenter les Server Actions pour signup/signin/signout

### 3. Pages & UI
- [ ] Page d'accueil (liste des publications)
- [ ] Pages d'auth (signin, signup)
- [ ] Page de soumission de manuscrit
- [ ] Interface admin

### 4. Fonctionnalités core (Semaine 1-3)
- [ ] Authentification complète
- [ ] Soumission de manuscrits
- [ ] Acceptance/rejet par admin
- [ ] Publications publiques
- [ ] Commentaires & modération
- [ ] Système de notation
- [ ] Recherche & filtres

### 5. Tests & CI/CD (Semaine 4)
- [ ] Écrire les tests (minimum 5)
- [ ] Configurer GitHub Actions
- [ ] Déployer sur Vercel

### 6. Bonus
- [ ] API IA pour catégorisation & pitch
- [ ] Features additionnelles

---

## 📖 Ressources

- Roadmap complète : `../portfolio-patphiletas/PROJET_ALTERNATIVE_ROADMAP.md`
- Better Auth : http://better-auth.com/
- Drizzle ORM : https://orm.drizzle.team/
- Zod : https://zod.dev/

---

## 🚀 Prochaines étapes

1. Mettre en place Neon PostgreSQL
2. Configurer Better Auth
3. Suivre le roadmap semaine par semaine

Bonne chance ! 🎓
