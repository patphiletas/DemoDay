# Refactoring — AlterNative

> Journal des améliorations techniques apportées après la première version fonctionnelle du projet.

---

## 1. Extraction des gardes d'authentification

**Fichier créé :** `src/lib/session.ts`

**Problème :** `requireAdmin()` était définie localement dans `admin.ts`, et `requireUserId()` dans `publication-interactions.ts`. Deux implémentations quasi-identiques — toute évolution de la logique de protection devait être répercutée à deux endroits.

**Solution :** Deux fonctions partagées exportées depuis un seul fichier :

```ts
export async function requireSession(): Promise<string>  // → userId
export async function requireAdmin(): Promise<string>    // → userId, vérifie role=admin
```

`requireAdmin` délègue à `requireSession` au lieu de dupliquer la récupération de session.

---

## 2. Extraction de `slugify`

**Fichier créé :** `src/lib/utils.ts`

**Problème :** La fonction `slugify` était définie dans `src/lib/actions/admin.ts`, un fichier de server actions. Elle n'avait pas à y être — c'est un utilitaire pur, sans dépendance serveur.

**Solution :** Déplacée dans `src/lib/utils.ts`, testable indépendamment et réutilisable depuis n'importe quelle couche.

---

## 3. Transaction DB dans `acceptManuscriptAction`

**Fichier :** `src/lib/actions/admin.ts`

**Problème :** L'acceptation d'un manuscrit effectuait 3 opérations DB séquentielles sans transaction :
1. `INSERT INTO publications`
2. `UPDATE manuscripts SET status = 'accepted'`
3. `INSERT INTO notifications`

Si l'opération 2 ou 3 échouait après que la publication ait été créée, la BDD se retrouvait dans un état incohérent (publication sans manuscrit marqué comme accepté).

**Solution :** Les 3 opérations sont enveloppées dans `db.transaction(async (tx) => { ... })`. L'envoi d'email reste en dehors — c'est intentionnel (best-effort, ne doit pas faire rater la transaction).

---

## 4. Upsert ratings avec `onConflictDoUpdate`

**Fichier :** `src/lib/actions/publication-interactions.ts`  
**Fichier :** `src/db/schema.ts`

**Problème :** La notation d'une publication utilisait un upsert manuel en deux requêtes :
1. `SELECT` pour vérifier si une note existe
2. `UPDATE` ou `INSERT` selon le résultat

Ce pattern n'est pas atomique — deux requêtes concurrentes peuvent créer des doublons.

**Solution :**

Ajout d'un index unique dans le schéma :
```ts
(t) => [uniqueIndex("ratings_publication_user_idx").on(t.publicationId, t.userId)]
```

Remplacement par un vrai upsert Drizzle :
```ts
await db.insert(ratings)
  .values({ publicationId, score, userId })
  .onConflictDoUpdate({
    target: [ratings.publicationId, ratings.userId],
    set: { score },
  });
```

> **Migration nécessaire :** `npm run db:push` pour appliquer la contrainte UNIQUE sur la table `ratings`.

---

## 5. Suppression de `SessionPanel`

**Fichier supprimé :** `src/components/SessionPanel.tsx`

**Problème :** Le composant affichait l'ID interne, l'email et la date de création de l'utilisateur sur la page d'accueil. Il était commenté dans tous les templates mais sa présence dans le repo créait un risque si quelqu'un le décommentait par inadvertance. C'était du code mort.

**Solution :** Suppression complète du composant et de son import dans `page.tsx`.

---

## 6. Correction de la navigation précédent/suivant

**Fichier :** `src/app/publications/[slug]/page.tsx`

**Problème 1 — Bug "suivant bloque" :** La requête "suivant" utilisait `gt(publications.id, ...)` avec `.orderBy(desc(publications.id))`, ce qui retournait le dernier ID de toute la table au lieu du suivant immédiat.

**Problème 2 — Navigation par `publishedAt` fragile :** La version originale utilisait `publishedAt` comme clé de navigation. Deux publications créées à la même seconde produisent le même timestamp — `gt`/`lt` ne trouvait rien.

**Solution :** Navigation basée sur `id` (séquentiel, garanti unique) + 4 requêtes parallèles pour le défilement infini :

```
prevDirect   = id < current  → orderBy desc  (précédent immédiat)
nextDirect   = id > current  → orderBy asc   (suivant immédiat)
lastPub      = id != current → orderBy desc  (dernier, wrap pour "précédent")
firstPub     = id != current → orderBy asc   (premier, wrap pour "suivant")

previousPublication = prevDirect ?? lastPub
nextPublication     = nextDirect ?? firstPub
```

Si une seule publication existe, `lastPub` et `firstPub` sont `null` (filtre `ne(id, current)`) → les deux boutons restent désactivés.

---

## 7. Textarea contrôlé dans `ManuscriptSubmissionForm`

**Fichier :** `src/components/ManuscriptSubmissionForm.tsx`

**Problème :** Le contenu EPUB était injecté via `ref.current.value` (mutation DOM impérative). Le navigateur ne reconnaissait pas la valeur comme saisie par l'utilisateur, ce qui faisait échouer la validation native `required` / `minLength` à la soumission — le formulaire bloquait même avec du contenu.

**Solution :** Le champ "Texte" est passé en composant contrôlé (`value={contentValue}` + `onChange`). L'import EPUB appelle `setContentValue(data.content)`, React met à jour l'état, la validation fonctionne normalement.

---

## 8. Config Cloudinary paresseuse

**Fichier :** `src/lib/cloudinary.ts`

**Problème :** `cloudinary.config()` était appelé à l'initialisation du module. Si Next.js chargeait le module avant que les variables d'environnement soient disponibles (cas possible avec le cache de modules des Server Actions), la config restait avec `api_key: undefined` et chaque upload échouait avec `"Must supply api_key"`.

**Solution :** `cloudinary.config()` est déplacé à l'intérieur de `uploadBuffer()`. La config est relue depuis `process.env` à chaque appel, garantissant des valeurs à jour.

---

## 9. Validation du type de fichier côté serveur

**Fichier :** `src/lib/actions/admin.ts`

**Problème :** L'input `accept="image/*"` n'est qu'une suggestion navigateur — un drag-and-drop ou une manipulation manuelle peut contourner le filtre. Sans vérification serveur, n'importe quel fichier (EPUB, PDF…) pouvait être envoyé à Cloudinary, provoquant une erreur d'upload.

**Solution :** Ajout d'une vérification `coverFile.type.startsWith("image/")` dans la Server Action avant d'appeler `uploadCover`. Un fichier non-image tombe silencieusement sur le fallback URL/couverture du manuscrit.

---

## Résumé des fichiers impactés

| Fichier | Nature du changement |
|---|---|
| `src/lib/session.ts` | Créé — gardes d'auth partagés |
| `src/lib/utils.ts` | Créé — `slugify`, `parseChapters` |
| `src/lib/actions/admin.ts` | Transaction, validation image, édition manuscrit (titre, auteur, texte), couverture publication, pitch préservé |
| `src/lib/actions/publication-interactions.ts` | Upsert natif, imports nettoyés |
| `src/db/schema.ts` | `uniqueIndex` ratings + colonne `pitch` sur `manuscripts` |
| `src/db/migrations/0002_easy_fallen_one.sql` | Ajout `pitch` sur `manuscripts` |
| `src/components/SessionPanel.tsx` | Supprimé |
| `src/app/page.tsx` | Import `SessionPanel` retiré, limite publications supprimée |
| `src/app/publications/[slug]/page.tsx` | Navigation, index chapitres, `CoverZoom`, `ScrollToTop` |
| `src/components/ManuscriptSubmissionForm.tsx` | Textarea contrôlé, import EPUB, couverture pré-remplie |
| `src/components/ScrollToTop.tsx` | Créé — bouton retour en haut |
| `src/components/CoverZoom.tsx` | Créé — lightbox couverture |
| `src/lib/epub.ts` | Créé — parsing EPUB, extraction couverture, fallback manifest |
| `src/lib/cloudinary.ts` | Config lazy, `uploadCoverBuffer` |
