# Routes du projet — Référence complète

## Pages (App Router)

### `/` — Homepage
**Fichier :** `src/app/page.tsx`  
**Accès :** public  
**Rendu :** Server Component, dynamique (données en temps réel)

Affiche le carousel de publications et la barre de recherche. Accepte le paramètre `?q=` pour la recherche full-text (ILIKE sur titre, pitch, catégorie, auteur). Sans `?q=`, toutes les publications visibles sont affichées par date décroissante.

Données chargées : publications visibles + stats de notation agrégées + derniers commentaires + note de l'utilisateur connecté (si session).

---

### `/signin` — Connexion
**Fichier :** `src/app/(auth)/signin/page.tsx`  
**Accès :** public (redirection vers `/` si déjà connecté non implémentée)  
**Rendu :** Client Component (`"use client"` + `useActionState`)

Formulaire email + mot de passe. L'action `signinAction` valide via Zod, applique le rate limit (5 tentatives / 15 min par IP), appelle Better Auth. En cas de succès → `redirect("/")`.

---

### `/signup` — Inscription
**Fichier :** `src/app/(auth)/signup/page.tsx`  
**Accès :** public  
**Rendu :** Client Component (`"use client"` + `useActionState`)

Formulaire email + nom d'utilisateur + mot de passe + confirmation. L'action `signupAction` vérifie la concordance des mots de passe, valide via Zod, crée le compte Better Auth, envoie l'email de bienvenue (best-effort), redirige vers `/`.

---

### `/dashboard` — Espace personnel
**Fichier :** `src/app/dashboard/page.tsx`  
**Accès :** connecté uniquement (redirect `/signin` si absent)  
**Rendu :** Server Component, dynamique

Affiche 3 métriques (livres favoris, manuscrits soumis, manuscrits acceptés) et 3 panneaux : publications notées 5★, historique des soumissions (5 dernières), manuscrits acceptés (5 derniers).

> ⚠️ La garde d'auth est faite manuellement (`auth.api.getSession()`) au lieu d'utiliser `requireSession()`.

---

### `/manuscripts/submit` — Soumission de manuscrit
**Fichier :** `src/app/manuscripts/submit/page.tsx`  
**Accès :** connecté uniquement (redirect `/signin`)  
**Rendu :** Server Component (wrapper) + Client Component (formulaire)

La page vérifie la session côté serveur puis rend `ManuscriptSubmissionForm` (client). Le formulaire permet l'import EPUB, la saisie manuelle, l'ajout d'un pitch et d'une couverture. Soumission via `submitManuscriptAction` → redirect `/dashboard`.

---

### `/admin` — Dashboard administration
**Fichier :** `src/app/admin/page.tsx`  
**Accès :** admin uniquement (`requireAdmin()` → redirect `/` si rôle insuffisant)  
**Rendu :** Server Component, dynamique

4 sections :
- **Manuscrits en attente** : lecture/modification du texte, acceptation (avec pitch, note éditoriale, couverture), refus (avec motif), suppression définitive
- **Publications** : toggle visibilité, dépublication ("remettre en manuscrit"), mise à jour de la couverture
- **Manuscrits refusés** : liste + suppression définitive
- **Commentaires** : tous les commentaires avec soft delete et restauration

Chaque action est un `<form action={serverAction}>` sans JavaScript client.

---

### `/publications/[slug]` — Page de lecture
**Fichier :** `src/app/publications/[slug]/page.tsx`  
**Accès :** public (seules les publications `isVisible = true` sont accessibles, les autres → `notFound()`)  
**Rendu :** Server Component, dynamique

Affiche la publication complète : couverture (avec lightbox `CoverZoom`), métadonnées, pitch, texte structuré en chapitres, barre de contrôles `ReadingTextControls` (taille A-/A+, dropdown chapitres), navigation précédent/suivant (wrap circulaire), notation 1-5★ (si connecté), commentaires (formulaire si connecté).

Le slug suit le format `{slugify(titre)}-{manuscriptId}`.

---

## Routes API

### `POST /api/parse-epub` — Parsing EPUB
**Fichier :** `src/app/api/parse-epub/route.ts`  
**Accès :** aucune auth vérifiée (appelée depuis `ManuscriptSubmissionForm`)  
**Corps :** `multipart/form-data` avec champ `file` (`.epub`, max 20 Mo)

Valide le fichier, appelle `parseEpub()`, upload la couverture sur Cloudinary si présente.

**Réponse succès (200) :**
```json
{
  "title": "Au bonheur des dames",
  "author": "Émile Zola",
  "content": "## Chapitre 1\n\nTexte...",
  "coverImageUrl": "https://res.cloudinary.com/..."
}
```

**Réponses d'erreur :**
| Code | Cas |
|---|---|
| 400 | Fichier absent ou extension ≠ `.epub` |
| 413 | Fichier > 20 Mo |
| 422 | EPUB illisible (parsing échoué) |

> ⚠️ Pas de rate limiting sur cette route.

---

### `GET|POST /api/auth/[...auth]` — Endpoints Better Auth
**Fichier :** `src/app/api/auth/[...auth]/route.ts`  
**Accès :** géré par Better Auth  

Route catch-all générée par `toNextJsHandler(auth)`. Expose les endpoints internes de Better Auth. Le code de l'application ne les appelle pas directement.

| Endpoint | Méthode | Usage interne |
|---|---|---|
| `/api/auth/sign-up/email` | POST | `auth.api.signUpEmail()` |
| `/api/auth/sign-in/email` | POST | `auth.api.signInEmail()` |
| `/api/auth/sign-out` | POST | `auth.api.signOut()` |
| `/api/auth/session` | GET | `auth.api.getSession()` |

---

## Server Actions

Les Server Actions ne sont pas des routes HTTP au sens strict mais sont accessibles via `POST` sur l'URL de la page qui les utilise (mécanisme interne Next.js).

| Action | Fichier | Déclenché par | Effet |
|---|---|---|---|
| `signupAction` | `actions/auth.ts` | `<form>` `/signup` | Crée le compte, redirige `/` |
| `signinAction` | `actions/auth.ts` | `<form>` `/signin` | Connecte, redirige `/` |
| `signoutAction` | `actions/auth.ts` | `<form>` Navbar | Déconnecte, redirige `/` |
| `submitManuscriptAction` | `actions/manuscripts.ts` | `<form>` `/manuscripts/submit` | Insère manuscrit, redirige `/dashboard` |
| `ratePublicationAction` | `actions/publication-interactions.ts` | `<form>` `/publications/[slug]` | Upsert note, revalide `/` + `/dashboard` |
| `commentPublicationAction` | `actions/publication-interactions.ts` | `<form>` `/publications/[slug]` | Insère commentaire, revalide `/` |
| `editManuscriptContentAction` | `actions/admin.ts` | `<form>` `/admin` | Met à jour titre/auteur/contenu, revalide `/admin` |
| `acceptManuscriptAction` | `actions/admin.ts` | `<form>` `/admin` | Crée publication, revalide `/admin` + `/` |
| `rejectManuscriptAction` | `actions/admin.ts` | `<form>` `/admin` | Passe en "rejected", revalide `/admin` |
| `unpublishAction` | `actions/admin.ts` | `<form>` `/admin` | Supprime publication, revalide `/admin` + `/` |
| `updatePublicationCoverAction` | `actions/admin.ts` | `<form>` `/admin` | Met à jour couverture, revalide `/admin` + `/` |
| `togglePublicationVisibilityAction` | `actions/admin.ts` | `<form>` `/admin` | Bascule `isVisible`, revalide `/admin` + `/` |
| `deleteManuscriptAction` | `actions/admin.ts` | `<form>` `/admin` | Supprime manuscrit, revalide `/admin` |
| `deleteCommentAction` | `actions/admin.ts` | `<form>` `/admin` | Soft delete commentaire, revalide `/admin` + `/` |
| `restoreCommentAction` | `actions/admin.ts` | `<form>` `/admin` | Restaure commentaire, revalide `/admin` + `/` |

---

## Fichiers spéciaux App Router

| Fichier | Rôle |
|---|---|
| `src/app/layout.tsx` | Layout racine : `<html>`, `<body>`, script thème, `<Navbar>`, `<main>` |
| `src/app/error.tsx` | Boundary d'erreur pour toutes les pages : affiche un message + bouton "Réessayer" |

---

## Résumé des accès

| Route | Non connecté | Connecté | Admin |
|---|---|---|---|
| `/` | ✅ Lecture seule (sans note) | ✅ Avec notes personnelles | ✅ |
| `/signin` | ✅ | ✅ (pas de redirect auto) | ✅ |
| `/signup` | ✅ | ✅ (pas de redirect auto) | ✅ |
| `/dashboard` | 🔒 → `/signin` | ✅ | ✅ |
| `/manuscripts/submit` | 🔒 → `/signin` | ✅ | ✅ |
| `/admin` | 🔒 → `/signin` | 🔒 → `/` | ✅ |
| `/publications/[slug]` | ✅ (lecture + nav, sans note/commentaire) | ✅ (note + commentaire actifs) | ✅ |
| `POST /api/parse-epub` | ✅ (pas d'auth) | ✅ | ✅ |
| `/api/auth/*` | géré par Better Auth | géré par Better Auth | géré par Better Auth |

---

## Points d'attention

- **Pas de middleware global** : chaque page vérifie la session individuellement. Une nouvelle page oubliée sans garde serait publique.
- **`/publications/[slug]` avec slug invalide** : appelle `notFound()` → Next.js affiche la page 404 par défaut (pas de `not-found.tsx` personnalisé).
- **`/api/parse-epub` sans auth** : n'importe qui peut envoyer un EPUB et consommer des ressources serveur + Cloudinary. Un rate limit par IP serait recommandé.
- **`revalidatePath("/publications/[slug]")` manquant** : après une note ou un commentaire, la page de publication n'est pas revalidée côté serveur (la page se met à jour uniquement au prochain chargement).
