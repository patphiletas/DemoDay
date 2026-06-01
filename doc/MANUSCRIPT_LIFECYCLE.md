# Cycle de vie d'un manuscrit

## Vue d'ensemble

Un manuscrit passe par plusieurs états depuis sa soumission jusqu'à sa publication ou suppression. Toutes les transitions sont gérées par des Server Actions dans `src/lib/actions/`.

```
          [Auteur soumet]
                ↓
           submitted  ←──────────────────────────────┐
                ↓                                     │
        ┌───────┴───────┐                             │
        ↓               ↓                             │
    accepted         rejected                         │
        ↓               ↓                        unpublish
   [publication]    [archivé]                         │
        ↓                                             │
    visible / masqué ────────────────────────────────┘
```

---

## États du champ `status`

| Valeur | Signification | Qui peut en sortir |
|---|---|---|
| `"submitted"` | Déposé, en attente de décision | Admin (accept / reject) |
| `"accepted"` | Accepté, une publication existe | Admin (unpublish) |
| `"rejected"` | Refusé, archivé | Admin (delete) |

> Il n'y a pas de statut `"published"` — la publication est une entité séparée dans la table `publications`. Le statut `"accepted"` sur le manuscrit signifie qu'une publication lui correspond.

---

## Étape 1 — Soumission

**Action :** `submitManuscriptAction` (`actions/manuscripts.ts`)  
**Déclencheur :** formulaire `/manuscripts/submit`

```
Auteur remplit le formulaire (titre, auteur, catégorie, contenu, pitch, couverture)
    → Validation Zod (manuscriptSchema)
    → Upload couverture Cloudinary si fichier fourni
    → INSERT INTO manuscripts (status = "submitted")
    → revalidatePath("/dashboard")
    → redirect("/dashboard")
```

**Données enregistrées :** `title`, `content`, `category`, `creditedAuthorName`, `coverImageUrl`, `pitch` (optionnel), `authorId`, `status = "submitted"`, `submittedAt = now()`

---

## Étape 2a — Acceptation

**Action :** `acceptManuscriptAction` (`actions/admin.ts`)  
**Déclencheur :** bouton "Accepter et publier" dans `/admin`

```
Admin saisit : pitch (requis), note éditoriale (optionnel), couverture (fichier/URL/proposée)
    → resolveCoverImage() : fichier uploadé > URL saisie > couverture auteur
    → Génération du slug : slugify(title) + "-" + manuscriptId
    → TRANSACTION :
        INSERT INTO publications (slug, title, content, category, pitch, coverImageUrl, ...)
            .returning({ id })          ← récupère l'ID généré
        UPDATE manuscripts SET
            status = "accepted",
            reviewedAt = now(),
            pitch = pitch saisi,
            coverImageUrl = couverture résolue,
            publicationId = id inséré   ← FK vers la publication
        INSERT INTO notifications (type = "manuscript_accepted", ...)
    → sendManuscriptAcceptedEmail().catch(() => null)   ← best-effort
    → revalidatePath("/admin") + revalidatePath("/")
```

**Résultat :** le manuscrit passe en `"accepted"`, une publication est créée et visible sur la homepage.

---

## Étape 2b — Refus

**Action :** `rejectManuscriptAction` (`actions/admin.ts`)  
**Déclencheur :** bouton "Refuser" dans `/admin` (motif requis)

```
Admin saisit la raison du refus
    → UPDATE manuscripts SET status = "rejected", reviewedAt = now(), rejectionReason = raison
    → INSERT INTO notifications (type = "manuscript_rejected", ...)
    → sendManuscriptRejectedEmail().catch(() => null)   ← best-effort
    → revalidatePath("/admin")
```

**Résultat :** le manuscrit disparaît de la liste "en attente" et apparaît dans "manuscrits refusés". L'auteur voit le statut "Refusé" dans son dashboard.

---

## Étape 3 — Dépublication (retour en soumis)

**Action :** `unpublishAction` (`actions/admin.ts`)  
**Déclencheur :** bouton "Remettre en manuscrit" dans `/admin`

```
    → Lecture de la publication (pub.pitch, pub.coverImageUrl)
    → Recherche du manuscrit lié :
        1. par manuscripts.publicationId = pub.id  (FK directe, données récentes)
        2. fallback : par authorId + title + status = "accepted"  (données antérieures)
    → TRANSACTION :
        DELETE FROM ratings WHERE publicationId = pub.id
        DELETE FROM comments WHERE publicationId = pub.id
        DELETE FROM publications WHERE id = pub.id
            → onDelete:"set null" met manuscripts.publicationId à NULL automatiquement
        UPDATE manuscripts SET
            status = "submitted",
            reviewedAt = null,
            pitch = pub.pitch,            ← préserve le pitch éditorialisé
            coverImageUrl = pub.coverImageUrl ?? manuscrit.coverImageUrl
    → revalidatePath("/admin") + revalidatePath("/")
```

**Résultat :** la publication et toutes ses notes/commentaires sont supprimés. Le manuscrit repasse en `"submitted"` avec le pitch et la couverture de la publication conservés — prêt à être réaccepté.

---

## Étape 4 — Suppression définitive

**Action :** `deleteManuscriptAction` (`actions/admin.ts`)  
**Déclencheur :** bouton "Supprimer définitivement" (disponible sur les manuscrits en attente ET refusés)

```
    → DELETE FROM manuscripts WHERE id = manuscriptId
    → revalidatePath("/admin")
```

Suppression directe, sans confirmation (côté UI). Aucun email envoyé.

---

## Visibilité d'une publication

Une fois acceptée, la publication peut être masquée sans être dépubliée.

**Action :** `togglePublicationVisibilityAction`

| `isVisible` | Homepage | Page de lecture |
|---|---|---|
| `true` | Apparaît dans le carousel | Accessible |
| `false` | N'apparaît pas | Retourne `notFound()` (404) |

---

## Données préservées à la dépublication

La dépublication ne détruit pas le travail éditorial :

| Donnée | Comportement |
|---|---|
| `pitch` | Copié depuis la publication vers le manuscrit |
| `coverImageUrl` | Copié depuis la publication (fallback : couverture originale du manuscrit) |
| `title`, `content`, `creditedAuthorName` | Déjà sur le manuscrit (potentiellement modifiés par l'admin avant acceptation) |
| Notes et commentaires | **Supprimés définitivement** (pas de corbeille) |

---

## Ce que voit l'auteur dans son dashboard

| Statut manuscrit | Dashboard |
|---|---|
| `submitted` | "Soumis" — en attente de décision |
| `accepted` | "Accepté" — dans la section "Manuscrits acceptés" avec la date |
| `rejected` | "Refusé" — toujours visible dans "Manuscrits soumis" avec le badge statut |
