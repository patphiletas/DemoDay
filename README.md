<div align="center">

# 📚 AlterNative

**Une maison d'édition fictive — soumettre, publier, lire.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel)](https://demo-day-wine.vercel.app/)
&nbsp;
[![Next.js](https://img.shields.io/badge/Next.js%2016-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
&nbsp;
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
&nbsp;
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
&nbsp;
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%20v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## Aperçu

AlterNative est une plateforme full-stack de gestion de publications : les auteurs soumettent des manuscrits, les admins les acceptent ou rejettent, et les lecteurs peuvent noter et commenter les œuvres publiées. Le projet couvre auth, BDD relationnelle, Server Actions, CI/CD et mode sombre.

lien vers la démo : https://demo-day-wine.vercel.app/

---

## Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 🔐 Authentification | Signup / signin / signout via Better Auth, sessions HTTP-only |
| 📝 Soumission de manuscrits | Formulaire avec validation Zod, statuts `submitted / accepted / rejected` |
| 🏠 Homepage | Carousel horizontal des publications, notation et commentaires en session |
| 📖 Page de lecture | Route dynamique `/publications/[slug]`, contenu complet, rating 1-5 étoiles |
| 🛡️ Dashboard admin | Gestion des manuscrits en attente, modération des commentaires, visibilité des publications |
| 👤 Dashboard perso | Manuscrits soumis, livres notés 5★, publications acceptées |
| 📧 Emails transactionnels | Resend — confirmation d'inscription, notification d'acceptation/refus de manuscrit |
| 🔔 Notifications in-app | Cloche en navbar, notifications de décision éditoriale |
| 🌙 Mode sombre | Basculement manuel + respect de `prefers-color-scheme`, sans flash au chargement |
| ✅ Tests & CI/CD | Vitest + GitHub Actions (lint + tests sur chaque push) + déploiement Vercel |

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 16.2.4 (App Router, Server Components, Server Actions) |
| Langage | TypeScript |
| Style | Tailwind CSS v4 |
| Base de données | PostgreSQL via [Neon](https://neon.tech) + Drizzle ORM |
| Auth | [Better Auth](https://www.better-auth.com) ^1.6.9 |
| Validation | Zod v4 |
| Emails | [Resend](https://resend.com) ^6 |
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
│   │   ├── layout.tsx       # root layout + ThemeProvider
│   │   └── page.tsx         # homepage carousel
│   ├── components/          # Navbar, ThemeToggle, ...
│   ├── db/
│   │   ├── schema.ts        # tables Drizzle
│   │   └── migrations/      # migrations SQL générées
│   └── lib/
│       ├── actions/         # server actions (auth, manuscripts, admin, interactions)
│       ├── auth.ts          # config Better Auth
│       ├── db.ts            # client Drizzle
│       ├── email.ts         # emails transactionnels Resend (bienvenue, acceptation, refus)
│       └── validation.ts    # schemas Zod + types inférés
├── .github/
│   └── workflows/
│       └── learn-github-actions.yml  # CI : npm ci + npm test
├── docker-compose.yml       # PostgreSQL local (alternative à Neon)
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
role ────────────── authorId (FK)           category
                    status                  pitch
                    submittedAt             coverImageUrl
                    reviewedAt              authorId (FK)
sessions            rejectionReason         publishedAt
accounts                                    isVisible
verifications       comments                ratings
                    ──────────              ───────
                    id                      id
                    content                 score (1–5)
                    publicationId (FK)      publicationId (FK)
                    authorId (FK)           userId (FK)
                    isModerated
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
NEXT_PUBLIC_APP_URL=http://localhost:3000   # URL publique (utilisée dans les liens emails)
RESEND_API_KEY=your_resend_key              # emails transactionnels via Resend
```

> **PostgreSQL local (optionnel)** — le `docker-compose.yml` lance un PostgreSQL sur le port 5433.
> `DATABASE_URL=postgresql://Pat:password@localhost:5433/mydatabase`

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
npm run test:ui   # Interface Vitest UI
```

Le workflow GitHub Actions (`.github/workflows/learn-github-actions.yml`) s'exécute à chaque push :
1. `npm ci`
2. `npm test`

---

## Objectifs pédagogiques

| # | Concept | Implémentation |
|---|---------|----------------|
| 1 | Routes dynamiques | `/publications/[slug]` |
| 2 | BDD + migrations | Drizzle ORM + PostgreSQL (Neon) |
| 3 | Auth + protections | Better Auth + sessions HTTP-only |
| 4 | Validation serveur | Zod v4 schemas |
| 5 | Tests unitaires | Vitest — validation schemas |
| 6 | CI/CD | GitHub Actions + Vercel |
| 7 | Mode sombre | `ThemeToggle` + `prefers-color-scheme` + Tailwind `dark:` |
| + | Emails transactionnels | Resend — bienvenue, acceptation, refus manuscrit |

---

<div align="center">

Projet pédagogique ADA Demoday · Patrice Philétas 2026

</div>
