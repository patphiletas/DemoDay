<div align="center">

# 📚 AlterNative

**Une maison d'édition fictive — soumettre, publier, lire.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel)](https://demo-day-wine.vercel.app/)
&nbsp;
[![Next.js](https://img.shields.io/badge/Next.js%2015-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
&nbsp;
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
&nbsp;
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
&nbsp;
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%20v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## Aperçu

AlterNative est une plateforme full-stack de gestion de publications : les auteurs soumettent des manuscrits, les admins les acceptent ou rejettent, et les lecteurs peuvent noter et commenter les œuvres publiées. Le projet couvre auth, BDD relationnelle, Server Actions, gestion d'erreurs, upload d'images, CI/CD et mode sombre.

lien vers la démo : https://demo-day-wine.vercel.app/

---

## Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 🔐 Authentification | Signup / signin / signout via Better Auth, sessions HTTP-only |
| 📝 Soumission de manuscrits | Formulaire avec validation Zod, statuts `submitted / accepted / rejected` |
| 🏠 Homepage | Carousel horizontal des publications, notation et commentaires en session |
| 🔍 Recherche | Barre de recherche full-text (ILIKE) sur titre, pitch, catégorie, auteur — URL partageable (`?q=`) |
| 📖 Page de lecture | Route dynamique `/publications/[slug]`, navigation précédent/suivant avec défilement infini |
| 🖼️ Couvertures | Upload d'image via Cloudinary ou URL externe, proposée à la soumission et confirmée à l'acceptation |
| 📥 Import EPUB | Extraction automatique du titre, de l'auteur, des chapitres (`##`) et de la couverture depuis un fichier `.epub` |
| 📖 Chapitres | Affichage structuré avec index sticky dans la barre latérale, bouton retour en haut de page |
| 🔠 Confort de lecture | Contrôle A− / A+ pour ajuster la taille du texte principal |
| 🔍 Zoom couverture | Lightbox au clic sur la couverture (fermeture Échap / clic extérieur) |
| 🛡️ Dashboard admin | Édition titre/auteur/texte avant publication, gestion couverture, refus/suppression manuscrits, modération commentaires, visibilité |
| 👤 Dashboard perso | Manuscrits soumis, livres notés 5★, publications acceptées |
| 📧 Emails transactionnels | Resend — confirmation d'inscription, notification d'acceptation/refus de manuscrit |
| 🌙 Mode sombre | Basculement manuel + respect de `prefers-color-scheme`, sans flash au chargement |
| 📱 Responsive | Layout mobile optimisé pour la lecture, l'admin, la navigation et le carousel |
| 🧯 Erreurs | Boundary `error.tsx` avec relance du rendu et helpers partagés pour les retours de Server Actions |
| 🔒 Rate limiting | 5 tentatives/15 min sur auth, 10 interactions/min par utilisateur |
| ✅ Tests & CI/CD | Vitest + GitHub Actions (tests sur chaque push) + déploiement Vercel |

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| Langage | TypeScript |
| Style | Tailwind CSS v4 |
| Base de données | PostgreSQL via [Neon](https://neon.tech) + Drizzle ORM |
| Auth | [Better Auth](https://www.better-auth.com) ^1.6.9 |
| Validation | Zod v4 |
| Emails | [Resend](https://resend.com) ^6 |
| Images | [Cloudinary](https://cloudinary.com) v2 |
| Tests | Vitest v4 |
| CI/CD | GitHub Actions + Vercel |

---

## Structure du projet

```
demoday/
├── src/
│   ├── app/
│   │   ├── (auth)/          # signin, signup
│   │   ├── admin/           # dashboard admin
│   │   ├── dashboard/       # dashboard utilisateur
│   │   ├── manuscripts/     # soumission de manuscrit
│   │   ├── publications/    # [slug] — page de lecture
│   │   ├── error.tsx        # fallback d'erreur App Router
│   │   ├── layout.tsx       # root layout + ThemeProvider
│   │   └── page.tsx         # homepage carousel + recherche
│   ├── components/          # Navbar, ThemeToggle, SearchBar, ...
│   ├── db/
│   │   ├── schema.ts        # tables Drizzle
│   │   └── migrations/      # migrations SQL générées
│   └── lib/
│       ├── actions/         # server actions (auth, manuscripts, admin, interactions)
│       ├── auth.ts          # config Better Auth
│       ├── cloudinary.ts    # upload d'images vers Cloudinary
│       ├── db.ts            # client Drizzle
│       ├── email.ts         # emails transactionnels Resend
│       ├── errors.ts        # ActionState + helpers d'erreurs de formulaires
│       ├── epub.ts          # parsing EPUB (chapitres, couverture) via epub2
│       ├── rate-limit.ts    # rate limiting in-memory
│       ├── session.ts       # gardes d'auth partagés (requireSession, requireAdmin)
│       ├── utils.ts         # utilitaires (slugify, parseChapters)
│       ├── validation.ts    # schemas Zod + types inférés
│       └── *.test.ts        # tests validation + helpers d'erreurs
├── .github/
│   └── workflows/
│       └── learn-github-actions.yml  # CI : npm ci + npm test -- --run
└── drizzle.config.ts
```

---

## Schéma de base de données

```
users               manuscripts             publications
─────               ───────────             ────────────
id                  id                      id
name                title                   slug
email               content                 title
username            category                content
role ────────────── creditedAuthorName      category
                    coverImageUrl           pitch
                    pitch                   coverImageUrl
                    authorId (FK)           creditedAuthorName
                    status                  authorId (FK)
                    submittedAt             publishedAt
                    reviewedAt              isVisible
sessions            rejectionReason
accounts
verifications       comments                ratings
                    ──────────              ───────
                    id                      id
                    content                 score (1–5)
                    publicationId (FK)      publicationId (FK)
                    authorId (FK)           userId (FK) ──┐
                    isModerated                           └ UNIQUE
                    isDeleted               notifications
                                            ─────────────
                    reports                 id
                    ───────                 userId (FK)
                    id                      type
                    commentId (FK)          message
                    reporterId (FK)         isRead
                    reason
                    isHandled
```

---

## Installation

```bash
npm install
```

**`.env.local`**
```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
BETTER_AUTH_SECRET=your_secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

RESEND_API_KEY=your_resend_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Lancement

```bash
# Migrations BDD
npm run db:push

# Serveur de développement
npm run dev
```

- App : `http://localhost:3000`

---

## Tests & CI

```bash
npm test          # Vitest en mode watch
npm test -- --run # Vitest en one-shot
npm run test:ui   # Interface Vitest UI
```

Le workflow GitHub Actions (`.github/workflows/learn-github-actions.yml`) s'exécute à chaque push :
1. `npm ci`
2. `npm test -- --run`

---

## Objectifs pédagogiques

| # | Concept | Implémentation |
|---|---------|----------------|
| 1 | Routes dynamiques | `/publications/[slug]` |
| 2 | BDD + migrations | Drizzle ORM + PostgreSQL (Neon) |
| 3 | Auth + protections | Better Auth + sessions HTTP-only |
| 4 | Validation serveur | Zod v4 schemas |
| 5 | Tests unitaires | Vitest — validation schemas + helpers d'erreurs |
| 6 | CI/CD | GitHub Actions + Vercel |
| 7 | Mode sombre | `ThemeToggle` + `prefers-color-scheme` + Tailwind `dark:` |
| 8 | Upload d'images | Cloudinary v2 depuis Server Action et route API |
| 9 | Recherche serveur | `searchParams` + `ilike` Drizzle, URL partageable |
| 10 | Parsing de fichiers | Import EPUB côté serveur — extraction titre, auteur, chapitres, couverture |
| + | Emails transactionnels | Resend — bienvenue, acceptation, refus manuscrit |

---

<div align="center">

Projet pédagogique ADA Demoday · Patrice Philétas 2026

</div>
