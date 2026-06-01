# Gestion des erreurs

## Vue d'ensemble

Le projet distingue trois niveaux d'erreurs :
1. **Erreurs de formulaire** — retournées à l'utilisateur via `ActionState`
2. **Erreurs de validation** — produites par Zod, normalisées en `ActionState`
3. **Erreurs runtime** — capturées par le boundary `error.tsx`

---

## Le type `ActionState`

**Fichier :** `src/lib/errors.ts`

```ts
export type ActionState = { error: string } | null;
```

- `null` → pas d'erreur (état initial ou succès)
- `{ error: string }` → message d'erreur à afficher

C'est le type de retour de toutes les Server Actions utilisées avec `useActionState`.

---

## Les helpers

```ts
// Construit un ActionState d'erreur
export function actionError(message: string): { error: string } {
  return { error: message };
}

// Extrait le premier message d'erreur Zod
export function validationActionError(error: ZodError): { error: string } {
  return actionError(error.issues[0]?.message ?? "Données invalides.");
}
```

**Pourquoi ces helpers ?**  
Sans eux, chaque action reconstruisait `{ error: "..." }` manuellement. Avec les helpers, les actions sont uniformes et le type `ActionState` est la seule source de vérité.

---

## Flux dans une Server Action

```ts
export async function submitManuscriptAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {

  // 1. Rate limit
  if (!interactionRateLimit("manuscript", userId)) {
    return actionError("Trop de soumissions. Réessaie dans une minute.");
  }

  // 2. Validation Zod
  const result = manuscriptSchema.safeParse({ ... });
  if (!result.success) {
    return validationActionError(result.error);  // premier message Zod
  }

  // 3. Logique métier — erreurs techniques silencieuses ou remontées
  try {
    await db.insert(...);
  } catch {
    return actionError("Une erreur est survenue.");
  }

  // 4. Succès → redirect (ne retourne pas ActionState)
  redirect("/dashboard");
}
```

---

## Affichage côté client

Les pages d'auth et le formulaire de soumission utilisent `useActionState` :

```tsx
const [state, formAction, isPending] = useActionState(submitManuscriptAction, null);

// state est null (pas d'erreur) ou { error: string }
{state?.error && (
  <div className="rounded-md border border-red-200 bg-red-50 p-4">
    <p className="text-sm font-semibold text-red-700">{state.error}</p>
  </div>
)}
```

Le message est affiché en rouge au-dessus du formulaire. `isPending` désactive le bouton pendant la soumission.

---

## Actions sans retour d'erreur utilisateur

Les Server Actions du dashboard admin (`admin.ts`) et des interactions de publication (`publication-interactions.ts`) ne retournent pas d'`ActionState` — elles utilisent `<form action={serverAction}>` direct. En cas d'erreur :
- Les validations retournent silencieusement (`return;`)
- La page se recharge sans changer (revalidation)
- L'erreur n'est pas visible pour l'utilisateur

---

## Validation Zod

**Fichier :** `src/lib/validation.ts`

Tous les schémas utilisent `.safeParse()` (ne lance pas d'exception) :

```ts
const result = manuscriptSchema.safeParse(data);
if (!result.success) {
  return validationActionError(result.error);
  // retourne le message du premier ZodIssue
  // ex : "Le titre doit contenir au moins 5 caractères"
}
// result.data est maintenant typé et validé
```

Seul le **premier** message d'erreur est remonté. Si plusieurs champs sont invalides simultanément, l'utilisateur ne voit que le premier.

---

## Boundary d'erreur runtime

**Fichier :** `src/app/error.tsx`

Capture les erreurs non gérées qui surviennent pendant le rendu d'une page (erreur DB inattendue, exception non catchée dans un Server Component, etc.).

```tsx
"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Une erreur est survenue</h2>
      <button onClick={() => unstable_retry(reset)}>Réessayer</button>
    </div>
  );
}
```

- `reset()` : retente le rendu du segment de route qui a échoué
- `unstable_retry(reset)` : variante Next.js qui retente le rendu côté serveur (pas seulement client)
- `error.digest` : identifiant côté serveur de l'erreur (visible dans les logs Vercel)

> Ce boundary couvre **toutes les pages** car `error.tsx` est à la racine de `src/app/`. Une page peut avoir son propre `error.tsx` pour un message plus contextuel.

---

## Tableau récapitulatif

| Type d'erreur | Mécanisme | Visible pour l'utilisateur |
|---|---|---|
| Rate limit dépassé | `actionError(message)` via `ActionState` | ✅ Message rouge sous le formulaire |
| Validation Zod échouée | `validationActionError(zodError)` | ✅ Premier message d'erreur |
| Email/mot de passe incorrect | `actionError(message)` dans catch | ✅ Message générique |
| Upload Cloudinary échoué | `.catch(() => null)` → fallback URL | ❌ Silencieux, fallback utilisé |
| Email Resend échoué | `.catch(() => null)` | ❌ Silencieux, best-effort |
| Erreur DB inattendue | `error.tsx` | ✅ Page d'erreur générique |
| Action admin invalide | `return;` silencieux | ❌ Silencieux, page inchangée |
| ID FormData invalide | `getId()` → `return;` | ❌ Silencieux |
