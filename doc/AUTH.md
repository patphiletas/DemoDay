# Authentification — Fonctionnement détaillé

## Vue d'ensemble

L'authentification repose sur **Better Auth** (bibliothèque open-source, similaire à NextAuth/Auth.js mais plus récente). Les sessions sont stockées en base PostgreSQL via Drizzle. Il n'y a pas de JWT — la session est lue depuis un cookie HTTP-only à chaque requête serveur.

```
Navigateur  →  Server Action (signup/signin)  →  Better Auth API  →  PostgreSQL
                                                        ↓
                                              Cookie HTTP-only "better-auth.session_token"
                                                        ↓
Toutes les pages serveur  →  auth.api.getSession(headers)  →  session.user
```

---

## Fichiers impliqués

| Fichier | Rôle |
|---|---|
| `src/lib/auth.ts` | Configuration Better Auth (adaptateur DB, plugins, URLs autorisées) |
| `src/lib/auth-client.ts` | Client Better Auth pour les composants React ("use client") |
| `src/app/api/auth/[...auth]/route.ts` | Route catch-all qui expose les endpoints HTTP de Better Auth |
| `src/lib/actions/auth.ts` | Server Actions : signup, signin, signout |
| `src/lib/session.ts` | Gardes réutilisables : `requireSession()` et `requireAdmin()` |
| `src/lib/rate-limit.ts` | Limitation du nombre de tentatives d'auth par IP |
| `src/app/(auth)/signup/page.tsx` | Page d'inscription |
| `src/app/(auth)/signin/page.tsx` | Page de connexion |

---

## Configuration Better Auth

**Fichier :** `lib/auth.ts`

```ts
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: { ... } }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  basePath: "/api/auth",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: ["http://localhost:3000", "https://demo-day-wine.vercel.app"],
  plugins: [nextCookies()],
});
```

Points clés :
- **`drizzleAdapter`** : Better Auth utilise directement les tables Drizzle du projet (`users`, `sessions`, `accounts`, `verifications`) — pas de tables séparées. `usePlural: true` correspond au nommage pluriel des tables.
- **`requireEmailVerification: false`** : les comptes sont actifs immédiatement, pas de confirmation email.
- **`nextCookies()`** : plugin Better Auth spécifique à Next.js — gère le cookie de session dans les Server Actions (les Server Actions n'ont pas accès aux headers standards de la même façon que les routes API).
- **`BETTER_AUTH_SECRET`** : clé de signature des tokens de session. Si elle change, toutes les sessions existantes sont invalidées.
- **`trustedOrigins`** : liste blanche des origines autorisées à faire des requêtes auth (protection CSRF).

### Variables d'environnement requises

| Variable | Valeur | Usage |
|---|---|---|
| `BETTER_AUTH_SECRET` | Chaîne aléatoire longue | Signature des sessions |
| `BETTER_AUTH_URL` | `http://localhost:3000` en dev, URL Vercel en prod | URL de base pour les redirects |
| `DATABASE_URL` | Connexion PostgreSQL | Stockage des sessions |

---

## Route catch-all Better Auth

**Fichier :** `src/app/api/auth/[...auth]/route.ts`

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { POST, GET } = toNextJsHandler(auth);
```

Better Auth expose ses propres endpoints REST sous `/api/auth/*` :
- `POST /api/auth/sign-up/email` — inscription
- `POST /api/auth/sign-in/email` — connexion
- `POST /api/auth/sign-out` — déconnexion
- `GET /api/auth/session` — session courante

Ces routes sont utilisées en interne par Better Auth. Le code de l'application ne les appelle pas directement — il passe par `auth.api.*` côté serveur ou `authClient.*` côté client.

---

## Flux d'inscription

**Fichier :** `actions/auth.ts` — `signupAction()`

```
[Page /signup] → useActionState(signupAction) → <form action={formAction}>
                                                         ↓
                                              signupAction(formData)
                                                    1. Rate limit IP (5/15min)
                                                    2. password === confirmPassword
                                                    3. Validation Zod (email, username, password ≥ 8 chars)
                                                    4. auth.api.signUpEmail({ email, password, name })
                                                    5. sendWelcomeEmail().catch(() => null)
                                                    6. redirect("/")
```

La validation Zod (`signupSchema`) vérifie :
- Email valide (`.email()`)
- Username : 3-100 chars, uniquement `[a-zA-Z0-9._-]`
- Password : minimum 8 caractères

Better Auth hash le mot de passe (bcrypt) et crée les entrées dans `users` et `accounts`. La session est créée et le cookie posé immédiatement après l'inscription — l'utilisateur est connecté sans étape supplémentaire.

L'email de bienvenue est envoyé **après** la création du compte et en dehors de tout try/catch : une erreur Resend n'empêche pas l'inscription.

---

## Flux de connexion

**Fichier :** `actions/auth.ts` — `signinAction()`

```
[Page /signin] → useActionState(signinAction) → <form action={formAction}>
                                                         ↓
                                              signinAction(formData)
                                                    1. Rate limit IP (5/15min)
                                                    2. Validation Zod (email requis, password requis)
                                                    3. auth.api.signInEmail({ email, password })
                                                         → vérifie le hash bcrypt en base
                                                         → crée une entrée dans sessions
                                                         → pose le cookie HTTP-only
                                                    4. redirect("/")
```

En cas d'échec (email inconnu ou mot de passe incorrect), Better Auth lance une exception. Le `catch` retourne un message générique `"Email ou mot de passe incorrect."` — intentionnellement imprécis pour ne pas indiquer si l'email existe.

---

## Flux de déconnexion

**Fichier :** `actions/auth.ts` — `signoutAction()`

La déconnexion est un `<form action={signoutAction}>` dans la Navbar — pas un `<button onClick>`. Cela garantit que ça fonctionne sans JavaScript.

```ts
await auth.api.signOut({ headers: await headers() });
redirect("/");
```

Better Auth supprime la session en base et expire le cookie. `headers()` est nécessaire pour que Better Auth identifie quelle session invalider.

---

## Lecture de session côté serveur

Dans les pages et actions serveur, la session se lit via :

```ts
const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
```

- `headers()` est obligatoire — Better Auth lit le cookie `better-auth.session_token` dans les headers de la requête entrante.
- `.catch(() => null)` : si Better Auth n'est pas joignable ou si la session est invalide, on obtient `null` plutôt qu'une exception.
- La session contient `session.user.id`, `session.user.name`, `session.user.email`.

### Où la session est lue directement (sans garde)

Ces pages lisent la session pour personnaliser l'affichage sans bloquer l'accès si absente :

| Page | Usage |
|---|---|
| `app/page.tsx` | Affiche les notes de l'utilisateur sur les cartes |
| `app/publications/[slug]/page.tsx` | Affiche la note de l'utilisateur, active le formulaire de commentaire |
| `components/Navbar.tsx` | Affiche "Mon espace / Déconnexion" ou "Connexion / S'inscrire" |

---

## Gardes d'authentification

**Fichier :** `lib/session.ts`

Deux fonctions partagées utilisées dans toutes les pages et actions qui nécessitent une auth :

### `requireSession()` → `userId: string`

```ts
export async function requireSession(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (!session) redirect("/signin");
  return session.user.id;
}
```

Redirige vers `/signin` si pas de session. Retourne uniquement l'`userId` — les actions n'ont pas besoin du reste.

### `requireAdmin()` → `userId: string`

```ts
export async function requireAdmin(): Promise<string> {
  const userId = await requireSession();
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (user?.role !== "admin") redirect("/");
  return userId;
}
```

Chaîne sur `requireSession()`, puis vérifie le champ `role` en base. La vérification se fait **en base** (pas dans le token) — si un rôle est modifié, l'effet est immédiat sans avoir à invalider la session.

### Utilisation dans le projet

| Contexte | Garde utilisée |
|---|---|
| `actions/admin.ts` (9 actions) | `requireAdmin()` |
| `actions/manuscripts.ts` | `requireSession()` |
| `actions/publication-interactions.ts` | `requireSession()` |
| `app/admin/page.tsx` | `requireAdmin()` |
| `app/manuscripts/submit/page.tsx` | `getSession()` direct (à migrer vers `requireSession()`) |
| `app/dashboard/page.tsx` | `getSession()` direct (à migrer vers `requireSession()`) |

---

## Rôles utilisateurs

La table `users` contient un champ `role varchar(20) NOT NULL DEFAULT 'user'`.

| Valeur | Accès |
|---|---|
| `"user"` | Valeur par défaut. Peut soumettre des manuscrits, noter, commenter. |
| `"admin"` | Accès au dashboard admin, toutes les Server Actions admin. |

**Il n'y a pas d'interface pour promouvoir un utilisateur en admin** — la modification doit se faire directement en base :
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

---

## Rate limiting

**Fichier :** `lib/rate-limit.ts`

| Limite | Fenêtre | Clé | Usage |
|---|---|---|---|
| 5 tentatives | 15 minutes | `signup:{ip}` ou `signin:{ip}` | Brute force sur les formulaires d'auth |
| 10 actions | 1 minute | `comment:{userId}` ou `manuscript:{userId}` | Spam de commentaires / soumissions |

Le store est un `Map` en mémoire — il se remet à zéro au redémarrage du serveur et ne fonctionne pas si Vercel déploie plusieurs instances. Pour une production robuste, il faudrait remplacer par `@upstash/ratelimit` + Vercel KV.

L'IP est extraite depuis les headers `x-forwarded-for` (Vercel) ou `x-real-ip`, avec fallback `"unknown"`. Toutes les requêtes sans IP identifiable sont regroupées sous la même clé — comportement conservateur mais acceptable.

---

## Tables en base

Better Auth gère automatiquement ces tables (créées par les migrations Drizzle) :

| Table | Contenu |
|---|---|
| `users` | Compte utilisateur : `id`, `name`, `email`, `role`, `username`, dates |
| `sessions` | Sessions actives : `token` (cookie value), `userId`, `expiresAt` |
| `accounts` | Providers liés (ici uniquement `credential` / email+password) : `password` hashé |
| `verifications` | Tokens de vérification (email, reset password) — non utilisé activement (`requireEmailVerification: false`) |

---

## Limitations / points d'attention

| Sujet | Situation actuelle |
|---|---|
| Pas de middleware global | Les routes sont protégées page par page via `session.ts`. Une URL non protégée par erreur serait accessible. Un middleware `middleware.ts` à la racine permettrait une protection centralisée. |
| Pas de reset de mot de passe | Aucun flux "mot de passe oublié" implémenté. |
| Pas de vérification email | `requireEmailVerification: false` — n'importe quelle adresse peut être utilisée. |
| `dashboard` et `submit` n'utilisent pas `requireSession()` | Ces deux pages font `getSession()` manuellement au lieu d'appeler la garde partagée. |
| Sessions sans expiration explicite | La durée de vie par défaut de Better Auth est de 7 jours (renouvelée à chaque visite). |
