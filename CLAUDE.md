@AGENTS.md
# AlterNative — Guide agent

## Contexte projet

Application de bibliothèque littéraire collaborative (Next.js App Router). Les utilisateurs soumettent des manuscrits, les admins les acceptent/refusent, les publications sont lisibles et commentables.

Stack : **Next.js 15+ App Router · TypeScript · Drizzle ORM · PostgreSQL · Better Auth · Tailwind CSS v4 · Cloudinary · Resend · Vitest**

---

## Next.js — ce qui change ici

**Lire `node_modules/next/dist/docs/` avant d'écrire du code.** Cette version a des breaking changes :

- `params` et `searchParams` dans les pages sont des `Promise<...>` → toujours `await params`
- Les Server Actions doivent être dans des fichiers `"use server"` ou marquées inline
- `headers()` et `cookies()` sont asynchrones → `await headers()`
- `revalidatePath` s'importe depuis `"next/cache"`
- La limite du body des Server Actions est configurée dans `next.config.ts` (`experimental.serverActions.bodySizeLimit`)

---

## Architecture

```
src/
  app/                   # Pages et routes (App Router)
    admin/page.tsx        # Dashboard admin (Server Component)
    error.tsx             # Boundary d'erreur applicative
    api/parse-epub/       # Route API pour parser les EPUB
    manuscripts/submit/   # Formulaire de soumission
    publications/[slug]/  # Page de lecture
  components/            # Composants React
  db/
    schema.ts             # Schéma Drizzle (source de vérité)
    migrations/           # Migrations SQL générées par drizzle-kit
  lib/
    actions/             # Server Actions ("use server")
      admin.ts           # Actions admin (accept, reject, delete, cover…)
      publication-interactions.ts  # Note, commentaire
    auth.ts              # Config Better Auth
    cloudinary.ts        # Upload image (config lazy — OBLIGATOIRE)
    db.ts                # Instance Drizzle partagée
    email.ts             # Emails Resend
    errors.ts            # Helpers d'erreurs pour Server Actions
    epub.ts              # Parser EPUB (epub2)
    session.ts           # Gardes d'auth partagés
    utils.ts             # slugify, parseChapters
```

---

## Règles à respecter

### Base de données
- Toujours utiliser `db.transaction()` pour les opérations multi-tables liées (ex : accepter un manuscrit)
- Supprimer les enfants avant le parent — pas de cascade déclaré dans le schéma (ratings, comments avant publications)
- Migrations : `npx drizzle-kit generate` puis appliquer avec `npx drizzle-kit migrate` ou via Node direct si le CLI ne peut pas joindre la DB
- Ne jamais modifier `src/db/migrations/` à la main sauf si le CLI génère une migration incomplète (ex : colonnes déjà en prod hors migration)

### Authentification
- Gardes partagés dans `src/lib/session.ts` : `requireSession()` → userId, `requireAdmin()` → userId + vérif role
- Ne jamais dupliquer la logique de session dans les Server Actions — toujours passer par ces deux fonctions

### Erreurs
- Les formulaires qui utilisent `useActionState` partagent le type `ActionState` et les helpers de `src/lib/errors.ts`
- Pour les validations Zod dans les Server Actions, retourner `validationActionError(result.error)` plutôt que reconstruire `{ error: ... }`
- `src/app/error.tsx` gère les erreurs runtime de l'App Router avec `unstable_retry`

### Cloudinary
- `cloudinary.config()` doit rester **à l'intérieur** de `uploadBuffer()` (init paresseuse)
- Toujours vérifier `file.type.startsWith("image/")` côté serveur avant d'appeler `uploadCover`
- Variables d'env : `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### Tailwind CSS v4
- Syntaxe canonique : `text-(--ink)`, `bg-(--paper-muted)`, `border-(--line)` — **pas** `text-[color:var(--ink)]`
- Tokens CSS définis dans le design system du projet (voir `globals.css`)

### EPUB
- Parser dans `src/lib/epub.ts` — `epub2` retourne parfois un tuple `[content, mime]`, parfois une string → toujours utiliser `Array.isArray(rawResult) ? rawResult[0] : rawResult`
- `stripHtml` décode toutes les entités HTML (numériques, nommées, hexadécimales)

### Emails
- Envois best-effort : toujours en dehors des transactions DB, avec `.catch(() => null)`

### Format `.env.local`
- **Pas d'espace après `=`, pas de guillemets** : `CLOUDINARY_CLOUD_NAME=dpnudoyxb` ✓ — Next.js ignore silencieusement les lignes malformées

---

## Commandes utiles

```bash
npm run dev          # Serveur de développement
npm test -- --run    # Tests Vitest (one-shot)
npm run build        # Build production
npx drizzle-kit generate   # Générer une migration
npx drizzle-kit migrate    # Appliquer les migrations
npx drizzle-kit studio     # UI d'exploration DB
```

---

## Ce qui n'est pas encore implémenté

- UI pour les notifications (table en BDD, pas d'interface)
- UI pour les signalements (table `reports` présente, pas d'interface)
- Middleware Next.js global (protection par page via `session.ts` pour l'instant)
