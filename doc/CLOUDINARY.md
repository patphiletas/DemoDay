# Cloudinary — Upload d'images

## Vue d'ensemble

Cloudinary stocke toutes les images de couverture du projet. Deux points d'entrée selon la source de l'image :
- **Formulaire de soumission / admin** : l'utilisateur upload un fichier `File`
- **Import EPUB** : la couverture est extraite sous forme de `Buffer`

---

## Fichier source

`src/lib/cloudinary.ts`

```ts
import { v2 as cloudinary } from "cloudinary";

function uploadBuffer(buffer: Buffer): Promise<string> {
  cloudinary.config({                          // ← init paresseuse (lazy)
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: "alternative/covers", resource_type: "image" },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("upload failed"));
          else resolve(result.secure_url);
        }
      )
      .end(buffer);
  });
}

export async function uploadCover(file: File): Promise<string> {
  return uploadBuffer(Buffer.from(await file.arrayBuffer()));
}

export async function uploadCoverBuffer(buffer: Buffer): Promise<string> {
  return uploadBuffer(buffer);
}
```

---

## Variables d'environnement

| Variable | Où la trouver |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Dashboard Cloudinary → Settings → Account |
| `CLOUDINARY_API_KEY` | Dashboard Cloudinary → Settings → Access Keys |
| `CLOUDINARY_API_SECRET` | Dashboard Cloudinary → Settings → Access Keys |

> **Format `.env.local` :** pas d'espace après `=`, pas de guillemets.  
> `CLOUDINARY_CLOUD_NAME=moncloud` ✅  
> `CLOUDINARY_CLOUD_NAME = "moncloud"` ❌ (Next.js ignore silencieusement la ligne)

---

## Init paresseuse (lazy config)

`cloudinary.config()` est appelé **à l'intérieur** de `uploadBuffer()`, pas au niveau module.

**Pourquoi :** si la config était au niveau module, le build Next.js importerait le module même pour les pages qui n'uploadent pas, et planterait si les variables d'env sont absentes (ex : build CI sans Cloudinary configuré).

Avec l'init paresseuse, la config n'est exécutée que si `uploadBuffer` est réellement appelée.

---

## Deux fonctions exposées

| Fonction | Entrée | Utilisée par |
|---|---|---|
| `uploadCover(file: File)` | Un objet `File` (formulaire HTML) | `acceptManuscriptAction`, `updatePublicationCoverAction`, `submitManuscriptAction` |
| `uploadCoverBuffer(buffer: Buffer)` | Un `Buffer` brut | Route `/api/parse-epub` (couverture extraite de l'EPUB) |

Les deux appellent `uploadBuffer()` en interne — `uploadCover` convertit d'abord le `File` en `Buffer` via `file.arrayBuffer()`.

---

## Flux selon le contexte

### Soumission d'un manuscrit

```
[Formulaire] champ <input type="file" name="coverFile">
    → submitManuscriptAction(formData)
    → coverFile instanceof File && coverFile.size > 0
    → uploadCover(coverFile)
    → URL Cloudinary stockée dans manuscripts.cover_image_url
```

### Acceptation admin

```
[Formulaire admin] champ coverFile ou coverImageUrl
    → acceptManuscriptAction(formData)
    → resolveCoverImage(formData, manuscript.coverImageUrl)
        Priorité : 1. fichier uploadé  2. URL saisie  3. couverture du manuscrit
    → si fichier : uploadCover(coverFile)
    → URL stockée dans publications.cover_image_url
```

### Import EPUB

```
[Formulaire soumission] champ <input type="file" accept=".epub">
    → fetch POST /api/parse-epub
    → parseEpub(file) → { coverBuffer: Buffer }
    → uploadCoverBuffer(coverBuffer)
    → URL renvoyée en JSON → pré-remplit coverImageUrl dans le formulaire
```

---

## Validation côté serveur

Avant tout upload depuis un `File`, le type MIME est vérifié :

```ts
if (coverFile instanceof File && coverFile.size > 0 && coverFile.type.startsWith("image/")) {
  coverImageUrl = await uploadCover(coverFile).catch(() => null);
}
```

- `instanceof File` : s'assure que ce n'est pas une string vide ou autre valeur FormData
- `coverFile.size > 0` : rejette les fichiers vides
- `coverFile.type.startsWith("image/")` : rejette les non-images

L'upload est enveloppé dans `.catch(() => null)` — si Cloudinary est indisponible, on passe au fallback (URL saisie ou couverture existante).

---

## Stockage

Toutes les images sont uploadées dans le dossier `alternative/covers` sur Cloudinary. Les URLs retournées sont des `secure_url` (HTTPS).

Les images ne sont jamais supprimées de Cloudinary lors d'une dépublication ou suppression de manuscrit — elles restent en stockage. Il n'y a pas de nettoyage automatique des images orphelines.

---

## Limitations connues

| Sujet | Situation |
|---|---|
| Pas de redimensionnement | Les images sont uploadées telles quelles, sans transformation Cloudinary |
| Pas de validation de taille côté serveur | Une image de 50 Mo passerait (seule la limite de la Server Action à 10 Mo dans `next.config.ts` protège) |
| Images orphelines | Les couvertures supprimées restent sur Cloudinary |
| `unoptimized` sur `next/image` | Les images Cloudinary utilisent `unoptimized={true}` — les transformations Next.js Image Optimization sont désactivées (Cloudinary fait déjà l'optimisation) |
