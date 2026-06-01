# Rate limiting

## Vue d'ensemble

Le projet implémente un rate limiting in-memory pour protéger deux types d'endpoints : les formulaires d'authentification (brute force) et les interactions utilisateur (spam).

**Fichier :** `src/lib/rate-limit.ts`

---

## Implémentation

```ts
type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

function check(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // Première requête ou fenêtre expirée → reset
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;  // limite atteinte

  entry.count++;
  return true;
}
```

La Map `store` est un singleton module-level. Chaque entrée contient un compteur et un timestamp de reset. Les entrées expirées ne sont pas purgées proactivement — elles sont réinitialisées à la prochaine requête pour la même clé.

---

## Les deux limiteurs

### `authRateLimit(label)` — Authentification

```ts
export async function authRateLimit(label: string): Promise<boolean> {
  const ip = await getClientIp();
  return check(`${label}:${ip}`, 5, 15 * 60 * 1000);
}
```

| Paramètre | Valeur |
|---|---|
| Limite | 5 tentatives |
| Fenêtre | 15 minutes |
| Clé | `"signup:{ip}"` ou `"signin:{ip}"` |
| Identifiant | Adresse IP du client |

Utilisé dans `signupAction` et `signinAction`. Async car nécessite `await headers()` pour lire l'IP.

### `interactionRateLimit(label, userId)` — Interactions

```ts
export function interactionRateLimit(label: string, userId: string): boolean {
  return check(`${label}:${userId}`, 10, 60 * 1000);
}
```

| Paramètre | Valeur |
|---|---|
| Limite | 10 actions |
| Fenêtre | 1 minute |
| Clé | `"comment:{userId}"` ou `"manuscript:{userId}"` |
| Identifiant | ID utilisateur connecté |

Utilisé dans `commentPublicationAction` et `submitManuscriptAction`. Synchrone.

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

- `x-forwarded-for` : header posé par les proxies (Vercel, Cloudflare). Peut contenir plusieurs IPs séparées par des virgules — on prend la première (IP du client réel).
- `x-real-ip` : fallback pour certains proxies
- `"unknown"` : fallback final — toutes les requêtes sans IP identifiable partagent la même clé (comportement conservateur)

---

## Comportement quand la limite est atteinte

Les deux limiteurs retournent `false`. La Server Action retourne alors un `ActionError` :

```ts
// Auth
if (!(await authRateLimit("signup"))) {
  return actionError("Trop de tentatives. Réessaie dans 15 minutes.");
}

// Interactions
if (!interactionRateLimit("comment", userId)) {
  return;  // silencieux pour les interactions
}
```

- **Auth** : message d'erreur affiché dans le formulaire
- **Interactions** : retour silencieux (pas de message utilisateur)

---

## Tableau récapitulatif

| Limiteur | Limite | Fenêtre | Clé | Déclenché dans |
|---|---|---|---|---|
| `authRateLimit("signup")` | 5 | 15 min | IP | `signupAction` |
| `authRateLimit("signin")` | 5 | 15 min | IP | `signinAction` |
| `interactionRateLimit("comment", userId)` | 10 | 1 min | userId | `commentPublicationAction` |
| `interactionRateLimit("manuscript", userId)` | 10 | 1 min | userId | `submitManuscriptAction` |

---

## Limitations

| Sujet | Détail |
|---|---|
| **In-memory** | Le store se remet à zéro à chaque redémarrage du serveur Node.js |
| **Single instance** | En cas de scale-out Vercel (plusieurs instances), chaque instance a son propre store → la limite effective est `limit × nb_instances` |
| **Pas de persistence** | Un redémarrage du serveur en cours de fenêtre remet les compteurs à zéro |
| **Pas de purge** | Les entrées expirées restent en mémoire jusqu'à la prochaine requête sur la même clé. Sur une longue durée avec beaucoup d'IPs uniques, la Map peut grossir |
| **Pas de rate limit sur `/api/parse-epub`** | La route de parsing EPUB n'est pas protégée |

**Pour une production robuste :** remplacer par `@upstash/ratelimit` + Vercel KV (store Redis distribué, persistant, partagé entre instances).
