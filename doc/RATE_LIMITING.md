# Rate limiting

## Vue d'ensemble

Le projet limite le nombre de requêtes sur trois types d'endpoints : les formulaires d'authentification (brute force), les interactions utilisateur (spam) et l'import EPUB (abus d'upload).

**Fichier :** `src/lib/rate-limit.ts`

**Depuis le 2026-11-14**, les compteurs sont stockés dans **Upstash Redis** (`@upstash/ratelimit`). Avant, ils vivaient dans une `Map` en mémoire : sur Vercel, chaque requête peut tomber sur une instance serverless différente, avec sa propre `Map`, ce qui rendait la limite quasiment inopérante en production.

---

## Deux modes

| Mode | Quand | Comportement |
|---|---|---|
| **Upstash Redis** | `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` définies (production) | Compteurs partagés entre toutes les instances, fenêtre glissante (`slidingWindow`), clés préfixées `alternative:ratelimit:` |
| **Mémoire** | Variables absentes (dev local, tests, CI) | `Map` locale (`checkMemory`), suffisante pour un seul processus. Un avertissement est logué si ce mode tourne sur Vercel |

Si Redis est injoignable, la requête est **autorisée** (et l'erreur loguée) : mieux vaut laisser passer quelques requêtes que bloquer tous les utilisateurs.

---

## Les règles

| Règle | Limite | Fenêtre | Identifiant |
|---|---|---|---|
| `auth` | 5 | 15 min | IP du client |
| `interaction` | 10 | 1 min | ID de l'utilisateur connecté |

### `authRateLimit(label)` — Authentification

```ts
export async function authRateLimit(label: string): Promise<boolean> {
  const ip = await getClientIp();
  return check("auth", `${label}:${ip}`);
}
```

Utilisé dans `signupAction` et `signinAction`.

### `interactionRateLimit(label, userId)` — Interactions

```ts
export async function interactionRateLimit(label: string, userId: string): Promise<boolean> {
  return check("interaction", `${label}:${userId}`);
}
```

Asynchrone depuis le passage à Redis (appel réseau) : les appelants font `await`. Utilisé dans `commentPublicationAction`, `submitManuscriptAction` et la route `POST /api/parse-epub`.

---

## Extraction de l'IP

```ts
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}
```

- `x-forwarded-for` : posé par Vercel. Peut contenir plusieurs IPs — on prend la première (client réel).
- `x-real-ip` : fallback pour certains proxies
- `"unknown"` : fallback final — toutes les requêtes sans IP identifiable partagent la même clé (comportement conservateur)

---

## Comportement quand la limite est atteinte

| Endpoint | Réponse |
|---|---|
| `signupAction` / `signinAction` | `ActionError` : « Trop de tentatives. Réessaie dans 15 minutes. » |
| `submitManuscriptAction` | `ActionError` : « Trop de soumissions. Réessaie dans une minute. » |
| `commentPublicationAction` | Retour silencieux (pas de message) |
| `POST /api/parse-epub` | `429` + « Trop d'imports. Réessaie dans une minute. » (affiché dans le formulaire) |

---

## Tableau récapitulatif

| Appel | Règle | Déclenché dans |
|---|---|---|
| `authRateLimit("signup")` | auth (5 / 15 min / IP) | `signupAction` |
| `authRateLimit("signin")` | auth (5 / 15 min / IP) | `signinAction` |
| `interactionRateLimit("comment", userId)` | interaction (10 / min / user) | `commentPublicationAction` |
| `interactionRateLimit("manuscript", userId)` | interaction (10 / min / user) | `submitManuscriptAction` |
| `interactionRateLimit("parse-epub", userId)` | interaction (10 / min / user) | `POST /api/parse-epub` |

`POST /api/parse-epub` exige aussi une **session** (401 sinon) : avant le 2026-11-14, la route était ouverte à tous, sans limite, alors qu'elle accepte des fichiers de 20 Mo et envoie les couvertures sur Cloudinary.

---

## Configuration Upstash

1. Créer une base Redis sur [upstash.com](https://upstash.com) (offre gratuite suffisante), ou réutiliser une base existante : les clés sont préfixées `alternative:ratelimit:`, donc pas de collision avec un autre projet.
2. Dans **Vercel → Settings → Environment Variables**, ajouter `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` (onglet « REST API » de la base Upstash).
3. Redéployer.

---

## Tests

`src/lib/rate-limit.test.ts` couvre le mode mémoire (`checkMemory`) : blocage à la limite, réouverture après la fenêtre, isolation des clés. Le mode Upstash n'est pas testé unitairement (il délègue à `@upstash/ratelimit`).

---

## Limitations restantes

| Sujet | Détail |
|---|---|
| **IP partagée** | Plusieurs personnes derrière la même IP (école, entreprise) partagent le quota d'authentification |
| **Fail open** | Si Upstash tombe, plus aucune limite ne s'applique jusqu'à son retour |
| **Mode mémoire en production** | Si les variables Upstash sont oubliées sur Vercel, le site fonctionne mais la limite redevient quasi inopérante (un avertissement est logué) |
