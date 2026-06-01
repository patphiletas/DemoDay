# Base de données — Schéma et conventions

## Stack

- **ORM :** Drizzle ORM
- **Base :** PostgreSQL (Neon en production)
- **Migrations :** générées par `drizzle-kit generate`, appliquées par `drizzle-kit migrate`
- **Schéma source :** `src/db/schema.ts` — c'est la seule source de vérité

---

## Tables

### `users`
Comptes utilisateurs. Gérée conjointement par Better Auth et par le code applicatif.

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `id` | `text` | PK | UUID généré par Better Auth |
| `name` | `text` | NOT NULL | Nom d'affichage (= `username` à l'inscription) |
| `email` | `text` | NOT NULL, UNIQUE | Clé d'identification |
| `email_verified` | `boolean` | NOT NULL, default `false` | Non utilisé (`requireEmailVerification: false`) |
| `image` | `text` | nullable | Avatar (non utilisé) |
| `username` | `varchar(100)` | UNIQUE, nullable | Pseudo choisi à l'inscription |
| `role` | `varchar(20)` | NOT NULL, default `'user'` | `'user'` ou `'admin'` |
| `created_at` | `timestamp` | NOT NULL | |
| `updated_at` | `timestamp` | NOT NULL | |

---

### `manuscripts`
Textes soumis par les utilisateurs, en attente de décision éditoriale.

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `id` | `integer` | PK, auto-increment | |
| `title` | `varchar(255)` | NOT NULL | |
| `content` | `text` | NOT NULL | Texte brut avec marqueurs `## Chapitre` |
| `category` | `varchar(100)` | nullable | |
| `credited_author_name` | `varchar(255)` | NOT NULL | Signature publique (≠ compte déposant) |
| `cover_image_url` | `text` | nullable | URL Cloudinary ou externe |
| `pitch` | `text` | nullable | Accroche proposée par l'auteur |
| `author_id` | `text` | NOT NULL, FK → `users.id` | Compte qui a déposé le texte |
| `status` | `varchar(20)` | NOT NULL, default `'submitted'` | `submitted` / `accepted` / `rejected` |
| `submitted_at` | `timestamp` | NOT NULL, default now() | |
| `reviewed_at` | `timestamp` | nullable | Date d'acceptation ou refus |
| `rejection_reason` | `text` | nullable | Motif envoyé à l'auteur |
| `publication_id` | `integer` | nullable, FK → `publications.id`, onDelete SET NULL | Lien vers la publication créée à l'acceptation |
| `created_at` | `timestamp` | NOT NULL | |
| `updated_at` | `timestamp` | NOT NULL | |

---

### `publications`
Textes publiés, visibles sur le site.

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `id` | `integer` | PK, auto-increment | |
| `slug` | `varchar(255)` | NOT NULL, UNIQUE | Format : `{slugify(title)}-{manuscriptId}` |
| `title` | `varchar(255)` | NOT NULL | Peut être modifié par l'admin avant acceptation |
| `content` | `text` | NOT NULL | |
| `category` | `varchar(100)` | NOT NULL | |
| `pitch` | `text` | NOT NULL | Saisi par l'admin à l'acceptation |
| `cover_image_url` | `text` | nullable | |
| `credited_author_name` | `varchar(255)` | NOT NULL | |
| `author_id` | `text` | NOT NULL, FK → `users.id` | |
| `published_at` | `timestamp` | NOT NULL, default now() | |
| `updated_at` | `timestamp` | NOT NULL | |
| `is_visible` | `boolean` | NOT NULL, default `true` | Masquer sans dépublier |

---

### `comments`
Commentaires des lecteurs sur les publications.

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `id` | `integer` | PK, auto-increment | |
| `content` | `text` | NOT NULL | Max 500 chars (côté Zod) |
| `publication_id` | `integer` | NOT NULL, FK → `publications.id` | |
| `author_id` | `text` | NOT NULL, FK → `users.id` | |
| `created_at` | `timestamp` | NOT NULL | |
| `is_moderated` | `boolean` | NOT NULL, default `false` | ⚠️ Dead code — jamais lu |
| `is_deleted` | `boolean` | NOT NULL, default `false` | Soft delete (modération admin) |

---

### `ratings`
Notes 1-5★ par utilisateur par publication. Une seule note par couple `(publication, utilisateur)`.

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `id` | `integer` | PK, auto-increment | |
| `score` | `integer` | NOT NULL | 1 à 5 |
| `publication_id` | `integer` | NOT NULL, FK → `publications.id` | |
| `user_id` | `text` | NOT NULL, FK → `users.id` | |
| `created_at` | `timestamp` | NOT NULL | |

**Index unique :** `(publication_id, user_id)` → permet l'upsert avec `onConflictDoUpdate`

---

### `notifications`
Notifications in-app créées lors des décisions éditoriales.

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `id` | `integer` | PK, auto-increment | |
| `user_id` | `text` | NOT NULL, FK → `users.id` | Destinataire |
| `type` | `varchar(50)` | NOT NULL | `manuscript_accepted` / `manuscript_rejected` |
| `related_id` | `integer` | nullable | ID du manuscrit concerné |
| `message` | `text` | NOT NULL | Texte de la notification |
| `is_read` | `boolean` | NOT NULL, default `false` | |
| `created_at` | `timestamp` | NOT NULL | |

> ⚠️ Table existante, données insérées, mais **aucune UI** pour les afficher.

---

### `reports`
Signalements de commentaires par les utilisateurs.

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `id` | `integer` | PK, auto-increment | |
| `comment_id` | `integer` | NOT NULL, FK → `comments.id` | |
| `reporter_id` | `text` | NOT NULL, FK → `users.id` | |
| `reason` | `varchar(500)` | NOT NULL | |
| `created_at` | `timestamp` | NOT NULL | |
| `is_handled` | `boolean` | NOT NULL, default `false` | |
| `is_banned` | `boolean` | NOT NULL, default `false` | |

> ⚠️ Table existante, schéma Zod présent, mais **aucune UI** (ni soumission ni traitement).

---

### Tables Better Auth (gérées automatiquement)

| Table | Rôle |
|---|---|
| `sessions` | Sessions actives avec token, userId, expiresAt |
| `accounts` | Providers liés au compte (ici : `credential` avec password hashé bcrypt) |
| `verifications` | Tokens de vérification email / reset password (non utilisés activement) |

---

## Relations

```
users ─────────────────────────┐
  │                             │
  ├─< manuscripts               │
  │     └─────────────────> publications
  │                             │
  ├─< sessions (Better Auth)    ├─< comments ──< reports
  ├─< accounts (Better Auth)    ├─< ratings
  └─< notifications             └─< notifications (indirectement via manuscripts)
```

**FKs avec comportement de suppression :**
- `sessions.user_id` → `users.id` **ON DELETE CASCADE** (Better Auth)
- `accounts.user_id` → `users.id` **ON DELETE CASCADE** (Better Auth)
- `manuscripts.publication_id` → `publications.id` **ON DELETE SET NULL**
- Toutes les autres FKs : **pas de cascade** → il faut supprimer les enfants manuellement avant le parent

---

## Conventions

**`varchar` vs `text`**
- `varchar(N)` : champs avec limite métier connue (title, slug, category, role, status)
- `text` : champs dont la longueur est illimitée ou variable (content, pitch, reason)

**Timestamps**
- `created_at` et `updated_at` : présents sur la plupart des tables, `defaultNow()`
- `submitted_at` sur `manuscripts` : sémantiquement identique à `created_at` (les deux ont `defaultNow()`)  
  → `created_at` est redondant avec `submitted_at` sur cette table

**IDs**
- `users.id` : `text` (UUID Better Auth)
- Toutes les autres tables : `integer` avec `generatedAlwaysAsIdentity()` (séquence PostgreSQL)

---

## Commandes utiles

```bash
# Générer une migration après modification de schema.ts
npx drizzle-kit generate

# Appliquer les migrations
npx drizzle-kit migrate

# Explorer la base en UI
npx drizzle-kit studio
```

> Ne jamais modifier les fichiers dans `src/db/migrations/` à la main, sauf si drizzle-kit génère une migration incomplète (ex : colonne déjà présente en production hors migration).
