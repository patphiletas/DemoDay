# Emails transactionnels — Resend

## Vue d'ensemble

Trois emails sont envoyés automatiquement lors d'événements métier. Tous sont gérés dans `src/lib/email.ts` via la bibliothèque **Resend**.

**Principe :** tous les envois sont **best-effort** — ils sont appelés avec `.catch(() => null)` en dehors des transactions DB. Une erreur d'envoi ne bloque jamais l'opération principale.

---

## Configuration

```ts
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "AlterNative <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
```

| Variable d'env | Usage |
|---|---|
| `RESEND_API_KEY` | Clé d'API Resend (obtenue sur resend.com) |
| `APP_URL` ou `NEXT_PUBLIC_APP_URL` | URL de base pour les liens dans les emails |

> ⚠️ L'adresse `onboarding@resend.dev` est un domaine de test Resend — les emails ne partent qu'à l'adresse vérifiée du compte Resend en mode sandbox. Pour la production, remplacer par un domaine vérifié (ex: `noreply@alternative-mag.fr`).

---

## Sécurité — échappement HTML

La fonction `h(str)` échappe les caractères HTML dans toutes les données utilisateur insérées dans les templates :

```ts
function h(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
```

Elle est appliquée sur `name`, `title` et `reason` — tout ce qui vient d'une saisie utilisateur.

---

## Email 1 — Bienvenue

**Fonction :** `sendWelcomeEmail(to, name)`  
**Déclenché par :** `signupAction` dans `actions/auth.ts`  
**Moment :** immédiatement après la création du compte, hors transaction

```
signupAction()
  → auth.api.signUpEmail(...)   ← compte créé
  → sendWelcomeEmail(email, username).catch(() => null)
  → redirect("/")
```

**Contenu :**
- Titre : "Bienvenue, {name} !"
- Corps : confirmation de création de compte
- CTA : lien vers `APP_URL` (homepage)
- Pied : mention "Si tu n'es pas à l'origine de cette inscription, ignore cet email."

**Sujet :** `Bienvenue sur AlterNative !`

---

## Email 2 — Manuscrit accepté

**Fonction :** `sendManuscriptAcceptedEmail(to, name, title, editorNote, slug)`  
**Déclenché par :** `acceptManuscriptAction` dans `actions/admin.ts`  
**Moment :** après la transaction DB, hors transaction

```
acceptManuscriptAction()
  → db.transaction(...)   ← publication créée
  → if (author) sendManuscriptAcceptedEmail(...).catch(() => null)
  → revalidatePath(...)
```

**Contenu :**
- Titre : "Bonne nouvelle, {name} !"
- Corps : confirmation que le manuscrit `{title}` est publié
- Note éditoriale : si `editorNote` est renseignée, affichée dans un `<blockquote>` avec bordure gauche noire
- CTA : lien vers `APP_URL/publications/{slug}` ("Voir la publication")

**Sujet :** `Félicitations — "{title}" est accepté !`

---

## Email 3 — Manuscrit refusé

**Fonction :** `sendManuscriptRejectedEmail(to, name, title, reason)`  
**Déclenché par :** `rejectManuscriptAction` dans `actions/admin.ts`  
**Moment :** après la mise à jour en base, hors transaction

```
rejectManuscriptAction()
  → db.update(manuscripts).set({ status: "rejected", ... })
  → if (author) sendManuscriptRejectedEmail(...).catch(() => null)
  → revalidatePath(...)
```

**Contenu :**
- Titre : "Bonjour {name},"
- Corps : annonce de non-sélection du manuscrit `{title}`
- Raison : si `reason` est renseignée, affichée dans un `<blockquote>` avec bordure grise
- Message d'encouragement : "Ne te décourage pas — tu peux soumettre un nouveau manuscrit à tout moment."
- CTA : lien vers `APP_URL/manuscripts/submit`

**Sujet :** `Décision éditoriale — "{title}"`

---

## Résumé des déclencheurs

| Email | Action | Condition |
|---|---|---|
| Bienvenue | `signupAction` | Toujours après inscription réussie |
| Accepté | `acceptManuscriptAction` | Si l'auteur est trouvé en base |
| Refusé | `rejectManuscriptAction` | Si l'auteur est trouvé en base |

---

## Template HTML

Les emails sont en HTML inline (pas de composants React Email). Le style est en `style=""` inline pour une compatibilité maximale avec les clients mail.

Structure commune :
```html
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
  <h1>Titre</h1>
  <p>Corps</p>
  [<blockquote>Note éditoriale ou raison</blockquote>]
  <a href="...">Bouton CTA</a>
  [<p style="font-size:12px;color:#999">Pied de page</p>]
</div>
```

---

## Limitations connues

| Sujet | Situation |
|---|---|
| Domaine expéditeur | `onboarding@resend.dev` → à remplacer par un domaine vérifié en production |
| Pas de file d'attente | Les envois sont directs (pas de retry automatique en cas d'échec réseau) |
| Pas d'email de dépublication | L'auteur n'est pas notifié si sa publication est dépubliée |
| Pas d'email de reset de mot de passe | Non implémenté |
