# Code map — AlterNative

## Pages (`src/app/`)

| Fichier | Ce que ça fait |
|---|---|
| `layout.tsx` | Shell HTML racine. Injecte un script inline `<script dangerouslySetInnerHTML>` qui lit `localStorage('theme')` et ajoute `.dark` sur `<html>` avant le premier rendu — évite le flash de couleur. Monte la `Navbar` (Server Component) et un `<main className="flex-1">` qui reçoit les pages enfants. |
| `page.tsx` | Homepage. Résout `searchParams` (promesse Next.js 15) et construit un filtre ILIKE sur titre / pitch / catégorie / auteur si `?q=` est présent. Charge en parallèle : toutes les publications visibles, notes de l'utilisateur connecté, derniers commentaires (limité à 12), stats de notation agrégées par publication. Assemble tout en Maps et passe les données aux `PublicationCard` dans le `HorizontalScroll`. |
| `admin/page.tsx` | Dashboard admin (Server Component protégé par `requireAdmin()`). Lance quatre requêtes en `Promise.all` : manuscrits en attente, manuscrits refusés, toutes les publications, tous les commentaires (avec jointure auteur). Chaque section du DOM contient des `<form action={serverAction}>` — pas de JavaScript client, la page se recharge après chaque action. Utilise des alias Drizzle pour les jointures multiples sur `users`. |
| `dashboard/page.tsx` | Espace personnel de l'utilisateur connecté (garde `requireSession()` manuelle — à migrer). Charge en parallèle : publications notées 5★ par l'utilisateur, ses 5 derniers manuscrits soumis (tous statuts), ses manuscrits acceptés. Affiche 3 métriques en haut et 3 panneaux en grille. Définit ses propres sous-composants serveur (`DashboardPanel`, `DashboardMetric`, `EmptyState`) pour éviter des fichiers séparés pour des composants très locaux. |
| `publications/[slug]/page.tsx` | Page de lecture. `await params` pour récupérer le slug (API Next.js 15). Lance 7 requêtes en parallèle : publication, stats de notation, commentaires (non supprimés), note de l'utilisateur, publication précédente, suivante, première et dernière (pour le wrap circulaire). Parse le contenu en chapitres via `parseChapters()`. Monte `ReadingTextControls` (sticky bar A-/A+), `CoverZoom` (lightbox), `ScrollToTop`. |
| `manuscripts/submit/page.tsx` | Page simple : vérifie la session puis rend `ManuscriptSubmissionForm`. La logique est entièrement dans le composant client. |
| `(auth)/signin/page.tsx` | Formulaire de connexion avec `useActionState(signinAction, null)`. Affiche le message d'erreur retourné par l'action (email inconnu, mot de passe incorrect, rate limit atteint). |
| `(auth)/signup/page.tsx` | Formulaire d'inscription avec `useActionState(signupAction, null)`. Inclut un champ `confirmPassword` vérifié côté serveur dans l'action. |
| `error.tsx` | Boundary d'erreur App Router (`"use client"`). Reçoit `error` et `reset` en props. Affiche un message générique et un bouton "Réessayer" qui appelle `unstable_retry(reset)` pour retenter le rendu serveur sans recharger la page. |
| `api/parse-epub/route.ts` | Route API POST (Edge non utilisé, Node.js). Valide la taille (max 20 Mo) et l'extension. Appelle `parseEpub()` qui écrit l'EPUB dans `/tmp` et retourne `{ title, author, content, coverBuffer }`. Si une couverture est extraite, l'upload vers Cloudinary via `uploadCoverBuffer()`. Retourne le JSON au client pour pré-remplir le formulaire de soumission. |

---

## Composants (`src/components/`)

| Fichier | Ce que ça fait |
|---|---|
| `Navbar.tsx` | Barre de navigation `sticky top-0` en Server Component. Lit la session côté serveur pour choisir entre "Connexion / S'inscrire" ou "Mon espace / Nom / Déconnexion". Sur mobile, le nom d'utilisateur est masqué (`md:inline`) et le bouton de déconnexion affiche "Sortir" au lieu de "Déconnexion" (`sm:hidden` / `sm:inline`). La déconnexion est un `<form action={signoutAction}>` sans JavaScript client. |
| `HorizontalScroll.tsx` | Conteneur flex `overflow-x-auto` avec `snap-x` pour le swipe tactile. Les flèches gauche/droite (`hidden sm:block`) sont positionnées en `absolute -left-4` / `-right-4` et scrollent de ±340px via `ref.current.scrollBy`. Sur mobile, seul le swipe est disponible. `-mx-1 px-1` permet de laisser dépasser légèrement le bord du premier/dernier item pour indiquer qu'il y a plus de contenu. |
| `PublicationCard.tsx` | Carte d'une publication affichée dans le carousel. La couverture utilise `next/image` avec `unoptimized` (images Cloudinary déjà optimisées). Sans couverture, un placeholder sombre affiche titre + auteur. Le corps affiche catégorie, titre, auteur, pitch (`line-clamp-2`), note moyenne avec nombre d'avis, et nombre de commentaires. Prend en props `ratingStat`, `comments`, `isNew` (badge "Nouveauté" si publié dans les 7 jours). |
| `ManuscriptSubmissionForm.tsx` | Formulaire "use client" avec `useActionState`. Le bouton d'import EPUB appelle `/api/parse-epub` en `fetch` et pré-remplit les champs titre, auteur, contenu (via `useRef`) et affiche un aperçu de la couverture extraite. Le champ `content` est un `textarea` contrôlé (`useState`) pour permettre la pré-injection du contenu EPUB. Gère les états de chargement (`epubLoading`) et d'erreur (`epubError`). |
| `ReadingTextControls.tsx` | Barre `sticky top-14` ("use client"). Gère un `sizeIndex` (0=Compact, 1=Confort, 2=Large) qui injecte `--reading-text-size` et `--reading-line-height` comme CSS variables sur le wrapper. Le dropdown chapitres utilise un `<details>` natif avec `ref` pour permettre la fermeture programmatique au clic sur un lien (sinon le `<details>` reste ouvert). |
| `SearchBar.tsx` | Input "use client" alimenté par `useSearchParams`. Le debounce (300ms) compare `nextQuery` à `currentQuery` avant de naviguer — évite un `router.replace` inutile si l'utilisateur efface puis retape la même chose. Quand la recherche est vide, supprime le paramètre `?q=` (retourne `/` propre). Les dépendances `useEffect` sont complètes pour éviter les avertissements ESLint. |
| `CoverZoom.tsx` | Bouton avec curseur zoom-in. Au clic, ouvre un overlay `position:fixed inset-0` avec un fond noir semi-transparent. L'image agrandie est contrainte par `max-h-[90dvh] max-w-[90dvw]`. Fermeture sur clic extérieur (le `stopPropagation` sur l'image évite la fermeture involontaire), sur la croix, ou sur `Échap` (via `addEventListener` dans un `useEffect`). |
| `ScrollToTop.tsx` | Bouton flottant `fixed bottom-6 right-6`. Utilise un `IntersectionObserver` sur un élément sentinelle en haut de page pour afficher/masquer le bouton selon la position de scroll. Au clic, `window.scrollTo({ top: 0, behavior: "smooth" })`. |
| `ThemeToggle.tsx` | Bouton icône soleil/lune. Au clic, bascule la classe `.dark` sur `document.documentElement` et persiste le choix dans `localStorage('theme')`. Lit l'état initial depuis le DOM (présence de `.dark`) pour rester synchronisé avec le script inline de `layout.tsx`. |
| `theme-provider.tsx` | Composant "use client" minimal qui hydrate le thème depuis `localStorage` au montage côté client. Complément du script inline pour les cas où le script n'a pas pu s'exécuter. |

---

## Base de données (`src/db/`)

### Tables principales

| Table | Rôle |
|---|---|
| `users` | Comptes utilisateurs. Champ `role` (`"user"` / `"admin"`) pour les accès admin. Géré par Better Auth. |
| `manuscripts` | Manuscrits soumis par les utilisateurs. `status` : `submitted` → `accepted` ou `rejected`. Contient `pitch`, `coverImageUrl` (proposés par l'auteur), `publicationId` (FK nullable vers `publications`, mise à jour à l'acceptation). |
| `publications` | Textes publiés. `slug` unique (`slugify(title)-${manuscriptId}`). `pitch` obligatoire. `isVisible` pour masquer sans dépublier. |
| `comments` | Commentaires sur les publications. `isDeleted` pour le soft delete (modération admin). `isModerated` présent en base mais non utilisé (dead code). |
| `ratings` | Notes 1-5★ par utilisateur par publication. Index unique `(publicationId, userId)` + `onConflictDoUpdate` pour l'upsert. |
| `notifications` | Créées à l'acceptation / refus d'un manuscrit. Table existante, pas encore d'UI. |
| `reports` | Signalements de commentaires. Table existante, pas encore d'UI. |

**Relations clés :**
- `manuscripts.authorId` → `users.id`
- `manuscripts.publicationId` → `publications.id` (nullable, `onDelete: set null`)
- `publications.authorId` → `users.id`
- `comments`, `ratings`, `reports` → `publications.id` + `users.id`

### Migrations

`src/db/migrations/` — générées par `npx drizzle-kit generate`, appliquées par `npx drizzle-kit migrate`. Ne jamais modifier manuellement sauf si le CLI produit une migration incomplète.

---

## Server Actions (`src/lib/actions/`)

| Fichier | Ce que ça fait |
|---|---|
| `admin.ts` | 9 actions admin. `getId(formData, key)` valide chaque ID (entier positif ou return immédiat). `resolveCoverImage(formData, fallback)` unifie la priorité fichier uploadé → URL saisie → fallback (utilisé dans `accept` et `updateCover`). `acceptManuscriptAction` : transaction qui insère la publication (`.returning({ id })` pour récupérer l'ID), met à jour le manuscrit (statut + `publicationId` FK), insère la notification ; entouré d'un try/catch pour gérer les collisions de slug. `unpublishAction` : cherche le manuscrit par FK `publicationId` (fallback par titre pour les données antérieures à la migration), puis transaction atomique delete ratings + comments + publication + update manuscrit. |
| `manuscripts.ts` | `submitManuscriptAction` : valide via `manuscriptSchema` (Zod), résout la couverture (fichier ou URL), insère le manuscrit avec `status: "submitted"`, redirige vers `/dashboard`. Rate limit : 10 actions/min par userId. |
| `auth.ts` | `signupAction` : vérifie la concordance des mots de passe, valide via `signupSchema`, crée le compte Better Auth, envoie l'email de bienvenue en best-effort. `signinAction` : valide via `signinSchema`, appelle `auth.api.signInWithPassword`. `signoutAction` : appelle `auth.api.signOut`. Rate limit : 5 tentatives / 15 min par IP pour signup et signin. |
| `publication-interactions.ts` | `ratePublicationAction` : valide via `ratingSchema`, `INSERT ... ON CONFLICT DO UPDATE` (upsert) sur `(publicationId, userId)`. `commentPublicationAction` : rate limit 10/min par userId, valide via `commentSchema`, insert le commentaire. Les deux revalident `/` et `/dashboard` mais pas encore `/publications/[slug]` (bug connu). |

---

## Lib (`src/lib/`)

| Fichier | Ce que ça fait |
|---|---|
| `session.ts` | Deux gardes réutilisées dans toutes les pages et actions protégées. `requireSession()` : récupère la session Better Auth depuis les headers, redirige vers `/signin` si absente, retourne `userId`. `requireAdmin()` : appelle `requireSession()` puis vérifie `user.role === "admin"` en base, redirige vers `/` sinon. |
| `errors.ts` | Type `ActionState = { error: string } \| null` partagé entre toutes les Server Actions qui utilisent `useActionState`. `actionError(message)` construit l'objet d'erreur. `validationActionError(zodError)` extrait le premier message Zod. Évite de reconstruire `{ error: "..." }` partout. |
| `validation.ts` | Schémas Zod utilisés côté serveur dans les actions et côté tests. `manuscriptSchema` inclut `pitch` (optionnel, max 300 chars). `commentSchema` limite le contenu à 500 chars. `ratingSchema` contraint le score à 1-5. `reportSchema` exige une raison de 10 à 500 chars. |
| `auth.ts` | Configuration Better Auth : Drizzle adapter (pointe sur l'instance `db`), sessions HTTP-only, plugin `username`. Exporte `auth` utilisé dans les pages serveur pour `auth.api.getSession()`. |
| `auth-client.ts` | Instancie `createAuthClient` pour les appels d'auth côté client (ex : `signOut()` depuis un composant). |
| `db.ts` | Instance Drizzle unique (singleton) avec le driver `postgres-js`. Exportée et importée partout dans les actions et pages. La chaîne de connexion vient de `DATABASE_URL`. |
| `cloudinary.ts` | Deux fonctions d'upload. `uploadCover(file: File)` : vérifie `file.type.startsWith("image/")`, convertit en `Buffer`, appelle `uploadBuffer`. `uploadCoverBuffer(buffer: Buffer)` : utilisée par la route EPUB (la couverture arrive déjà en Buffer). `cloudinary.config()` est appelé à l'intérieur de `uploadBuffer` (init paresseuse — évite les erreurs si les variables d'env sont absentes au build). |
| `email.ts` | Trois fonctions Resend. `sendWelcomeEmail` à l'inscription. `sendManuscriptAcceptedEmail` avec le lien vers la publication et la note éditoriale. `sendManuscriptRejectedEmail` avec la raison du refus. Toutes appelées avec `.catch(() => null)` (best-effort, une erreur d'email ne bloque pas l'opération principale). |
| `epub.ts` | `parseEpub(file)` : écrit l'EPUB dans un fichier temporaire `/tmp`, ouvre avec `epub2.createAsync()`, itère `epub.flow` (spine ordonné). Pour chaque chapitre, appelle `getChapterRawAsync()` (gère le tuple `[content, mime]` d'epub2), applique `stripHtml`. `stripHtml` retire d'abord les blocs `<style>` et `<script>` entiers, puis les tags, puis décode toutes les entités HTML (nommées, décimales, hexadécimales). Si la première ligne du corps correspond au titre du chapitre, elle est supprimée (les EPUBs dupliquent souvent le titre). Les titres de chapitres passent aussi dans `stripHtml` pour nettoyer les entités. La couverture est extraite via `epub.metadata.cover` ou en cherchant un item manifest dont l'id/href contient "cover". |
| `rate-limit.ts` | Store `Map<string, { count, resetAt }>` en mémoire (resets au redémarrage du serveur, ne fonctionne pas en multi-instance). `check(key, limit, windowMs)` est la fonction centrale. Deux wrappers publics : `authRateLimit(label)` (async, lit l'IP depuis les headers) et `interactionRateLimit(label, userId)` (synchrone). |
| `utils.ts` | `slugify(title)` : normalize NFD, supprime les diacritiques, remplace les non-alphanumériques par `-`. `parseChapters(content)` : split sur `/^## (.+)$/m`, retourne un tableau `{ title, content }` — retourne `[]` si moins d'un `##` trouvé (le texte est alors affiché tel quel sans index de chapitres). |

---

## Tests (`src/lib/`)

| Fichier | Ce que ça fait |
|---|---|
| `errors.test.ts` | Vérifie que `actionError` retourne `{ error: "..." }` et que `validationActionError` extrait bien le premier message Zod depuis un `ZodError`. |
| `validation.test.ts` | Tests sur les schémas Zod : cas valides, cas limites (longueurs min/max), messages d'erreur attendus. |
