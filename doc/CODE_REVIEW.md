# Revue de code — AlterNative

> Revue réalisée sur la base du code source complet du projet (Next.js 16 / App Router, Drizzle ORM, Better Auth, Zod, Tailwind v4, Vercel).
> Statuts mis à jour au 2026-05-27.

---

## Ce qui fonctionne bien

- Architecture App Router cohérente (server components, server actions, pas de client inutile)
- Validation Zod centralisée dans un seul fichier avec types inférés
- Schéma DB propre avec Drizzle, relations correctement déclarées
- Mode sombre sans flash d'écran (script inline + `suppressHydrationWarning`)
- Emails transactionnels en best-effort (non bloquants)
- Tests unitaires présents sur toute la couche de validation

---

## 1. Sécurité

### 1.1 XSS dans les emails — ✅ Corrigé

**Fichier :** `src/lib/email.ts`

Les données utilisateur sont maintenant échappées via la fonction `h()` avant interpolation dans les templates HTML.

---

### 1.2 Pas de rate limiting — ✅ Corrigé

**Fichier :** `src/lib/rate-limit.ts`

Rate limiting in-memory implémenté :
- `authRateLimit` : 5 tentatives / 15 min par IP (signin, signup)
- `interactionRateLimit` : 10 actions / min par userId (commentaires, soumissions)

> Note : le store est in-memory et se réinitialise au redémarrage du serveur. Pour une production multi-instance, remplacer par `@upstash/ratelimit` + Vercel KV.

---

### 1.3 `BETTER_AUTH_SECRET` sans vérification — 🟡 Ouvert

**Fichier :** `src/lib/auth.ts`

```ts
secret: process.env.BETTER_AUTH_SECRET,  // peut être undefined
```

**Correction recommandée :**
```ts
if (!process.env.BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET is not defined");
```

---

### 1.4 Email non vérifié à l'inscription — 🔵 Ouvert (intentionnel)

`requireEmailVerification: false` dans `auth.ts`. Acceptable pour un projet pédagogique, à activer pour une mise en production réelle.

---

### 1.5 L'ID utilisateur exposé publiquement — ✅ Corrigé

`SessionPanel.tsx` supprimé. L'ID interne n'est plus affiché nulle part dans l'UI.

---

### 1.6 `trustedOrigins` codées en dur — 🟡 Ouvert

**Fichier :** `src/lib/auth.ts`

```ts
trustedOrigins: ["http://localhost:3000", "https://demo-day-wine.vercel.app"],
```

**Correction recommandée :**
```ts
trustedOrigins: ["http://localhost:3000", process.env.NEXT_PUBLIC_APP_URL!].filter(Boolean),
```

---

## 2. Bugs

### 2.1 `unpublishAction` échoue si la publication a des commentaires ou des notes — 🟡 Ouvert

**Fichier :** `src/lib/actions/admin.ts`

La suppression d'une publication via `db.delete(publications)` échoue silencieusement si des `comments` ou `ratings` référencent cette publication (FK sans `onDelete: cascade`).

**Corrections possibles :**

Option A — cascade dans le schéma :
```ts
.references(() => publications.id, { onDelete: "cascade" })
```

Option B — supprimer les dépendances manuellement dans une transaction avant la publication.

---

### 2.2 Pool de connexions limité à 1 en serverless — 🟡 Ouvert

**Fichier :** `src/lib/db.ts`

`max: 1` peut épuiser les connexions Neon sous charge. Correction recommandée : passer au driver serverless Neon (`@neondatabase/serverless` + `drizzle-orm/neon-http`).

---

### 2.3 `unpublishAction` : correspondance publication → manuscrit fragile — 🔵 Ouvert

La liaison se fait par `(authorId, title)`. Stocker l'ID du manuscrit source directement sur la `publications` serait plus robuste.

---

## 3. Architecture

### 3.1 Protection des routes par copier-coller — ✅ Partiellement résolu

Les gardes `requireSession` et `requireAdmin` sont extraits dans `src/lib/session.ts` et partagés entre les server actions. Les pages protégées gardent encore leur propre vérification — un middleware global `src/middleware.ts` reste à implémenter pour centraliser complètement.

---

### 3.2 `requireAdmin()` effectue 2 requêtes DB — 🟡 Ouvert

La session Better Auth ne contient pas le rôle. Une extension de session via plugin Better Auth ou un champ personnalisé réduirait à 1 requête.

---

### 3.3 Features implémentées mais jamais exposées — 🔵 Partiellement

- **Notifications** : insertions en BDD présentes, UI absente
- **Signalements** : table et schéma Zod présents, aucune action serveur ni UI

---

### 3.4 Error Boundary App Router — ✅ Résolu

`src/app/error.tsx` fournit maintenant un fallback user-friendly avec relance via `unstable_retry`. Les retours d'erreurs des formulaires sont centralisés dans `src/lib/errors.ts`.

---

## 4. Qualité du code

### 4.1 Adresse expéditeur emails — domaine sandbox Resend — 🟡 Ouvert

`FROM = "AlterNative <onboarding@resend.dev>"` — domaine de test, emails arrivent souvent en spam. À remplacer par un domaine vérifié dans Resend.

---

### 4.2 La regex `slugify` — ✅ Déplacée dans `src/lib/utils.ts`

La fonction `slugify` est maintenant dans `src/lib/utils.ts`, réutilisable et testable indépendamment.

---

### 4.3 Couverture de tests — 🔵 Ouvert

Tests couvrent uniquement les schémas Zod. Les server actions (couche la plus critique) ne sont pas testées.

---

## Récapitulatif par priorité

| Priorité | Problème | Fichier | Statut |
|---|---|---|---|
| 🔴 Critique | XSS dans les emails | `email.ts` | ✅ Corrigé |
| 🔴 Critique | `unpublishAction` : violation FK silencieuse | `actions/admin.ts` | 🟡 Ouvert |
| 🟠 Élevée | Pas de rate limiting | `actions/auth.ts`, `actions/publication-interactions.ts` | ✅ Corrigé |
| 🟠 Élevée | Pool DB `max: 1` en serverless | `lib/db.ts` | 🟡 Ouvert |
| 🟠 Élevée | `BETTER_AUTH_SECRET` non vérifié | `lib/auth.ts` | 🟡 Ouvert |
| 🟡 Moyenne | Protection des routes par copier-coller | pages protégées | ✅ Partiel (`session.ts`) |
| 🟡 Moyenne | ID utilisateur exposé publiquement | `SessionPanel.tsx` | ✅ Corrigé (supprimé) |
| 🟡 Moyenne | `trustedOrigins` codé en dur | `lib/auth.ts` | 🟡 Ouvert |
| 🟡 Moyenne | Domaine sandbox Resend en prod | `lib/email.ts` | 🟡 Ouvert |
| 🔵 Faible | Email non vérifié à l'inscription | `lib/auth.ts` | 🔵 Intentionnel |
| 🔵 Faible | Regex slugify extraite | `lib/utils.ts` | ✅ Corrigé |
| 🔵 Faible | Features mortes (notifications, signalements) | `schema.ts` | 🔵 Partiel |
| 🔵 Faible | Couverture de tests insuffisante | `validation.test.ts` | 🔵 Ouvert |
