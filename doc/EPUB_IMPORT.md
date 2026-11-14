# Import EPUB — Fonctionnement détaillé

## Vue d'ensemble

L'import EPUB permet à un auteur de charger un fichier `.epub` dans le formulaire de soumission et d'en extraire automatiquement le **titre**, le **nom d'auteur**, le **contenu structuré en chapitres** et la **couverture**. L'auteur peut ensuite corriger les valeurs avant de soumettre.

```
[Formulaire]  →  POST /api/parse-epub  →  parseEpub()  →  Cloudinary (couverture)
    ↑                                                              ↓
 pré-remplit les champs ←────────────── JSON { title, author, content, coverImageUrl }
```

---

## Fichiers impliqués

| Fichier | Rôle |
|---|---|
| `src/components/ManuscriptSubmissionForm.tsx` | Déclencheur client : écoute le changement du `<input type="file">` et appelle l'API |
| `src/app/api/parse-epub/route.ts` | Point d'entrée HTTP : valide le fichier, orchestre le parsing et l'upload de couverture |
| `src/lib/epub.ts` | Cœur du parsing : lit le fichier, extrait les chapitres et la couverture |
| `src/lib/cloudinary.ts` | Upload de la couverture extraite vers Cloudinary |

---

## Étape 1 — Déclenchement côté client

**Fichier :** `ManuscriptSubmissionForm.tsx` — `handleEpubChange()`

L'utilisateur sélectionne un fichier `.epub`. L'événement `onChange` déclenche `handleEpubChange` :

1. Le fichier est empaqueté dans un `FormData` et envoyé en `POST /api/parse-epub`.
2. Pendant l'envoi, `epubLoading = true` désactive le champ et affiche "Extraction en cours…".
3. Si la réponse est OK, les champs du formulaire sont pré-remplis :
   - `titleRef.current.value = data.title` (ref directe, pas de re-render)
   - `authorRef.current.value = data.author` (idem)
   - `setContentValue(data.content)` (state contrôlé pour le textarea)
   - `coverUrlRef.current.value = data.coverImageUrl` + `setCoverPreview(...)` (affiche l'aperçu)
4. En cas d'erreur serveur ou réseau, `epubError` est affiché sous le champ fichier.

> Les champs titre et auteur utilisent des `ref` (et non du state) pour éviter un re-render complet du formulaire lors du pré-remplissage.

---

## Étape 2 — Validation et orchestration

**Fichier :** `api/parse-epub/route.ts`

La route vérifie deux conditions avant de traiter :
- Le fichier doit avoir l'extension `.epub` (vérification sur `file.name`)
- La taille ne doit pas dépasser **20 Mo** (`file.size > 20 * 1024 * 1024` → HTTP 413)

Ensuite :
1. Appelle `parseEpub(file)` — retourne `{ title, author, content, coverBuffer? }`
2. Si un `coverBuffer` est présent, appelle `uploadCoverBuffer(coverBuffer)` → obtient une URL Cloudinary
3. Retourne `{ title, author, content, coverImageUrl? }` en JSON

Le `coverBuffer` est séparé du reste du résultat (`const { coverBuffer, ...result } = ...`) pour ne pas l'envoyer dans la réponse JSON.

---

## Étape 3 — Parsing du fichier

**Fichier :** `lib/epub.ts` — `parseEpub(file)`

### 3a. Écriture temporaire

epub2 ne peut pas lire un `File` ou `Buffer` directement — il a besoin d'un chemin disque.
Le buffer est donc écrit dans `/tmp/epub-{timestamp}.epub`, puis supprimé dans le bloc `finally` (même en cas d'erreur).

```
file.arrayBuffer() → Buffer → writeFile(/tmp/epub-xxx.epub) → EPub.createAsync(path)
```

### 3b. Métadonnées

```ts
title  = epub.metadata.title ?? ""
author = epub.metadata.creator ?? ""
```

Ces valeurs viennent du fichier `content.opf` à l'intérieur de l'EPUB.

### 3c. Extraction des chapitres — Passage 1 (spine ordonné)

Le **spine** (`epub.flow`) est la liste ordonnée des fichiers HTML dans l'ordre de lecture défini par l'EPUB. C'est la source principale.

Pour chaque entrée du spine :
1. Résolution de l'ID : `chapter.id` ou lookup dans le manifest par `href`
2. `getChapterRawAsync(id)` — retourne le HTML brut  
   ⚠️ epub2 retourne parfois un tuple `[content, mime]`, parfois une string simple. Le code gère les deux : `Array.isArray(rawResult) ? rawResult[0] : rawResult`
3. `stripHtml(raw)` — nettoie le HTML (voir §3e)
4. Si le texte fait moins de **20 caractères**, il est ignoré (pages vides, pages de garde très courtes)
5. Le titre de chapitre : `chapter.title` (passé dans `stripHtml` pour décoder les entités), ou `Chapitre N` en fallback
6. **Déduplication du titre** : beaucoup d'EPUBs incluent le titre du chapitre dans le HTML du corps en plus du spine. Si la première ligne du texte correspond au titre (comparaison normalisée : minuscules + espaces réduits), elle est supprimée du corps.
7. Le chapitre est ajouté au tableau sous la forme `## Titre\n\nContenu`

### 3d. Extraction des chapitres — Passage 2 (fallback manifest)

Si `epub.flow` est vide (EPUB malformé ou sans spine), le parser parcourt directement les items HTML/XHTML du manifest. Les titres sont générés automatiquement (`Chapitre 1`, `Chapitre 2`…). Ce fallback est moins précis (ordre non garanti, doublons possibles).

### 3e. `stripHtml()` — nettoyage du HTML

Ordre des opérations (important) :

| Étape | Opération | Pourquoi |
|---|---|---|
| 1 | Supprime `<head>…</head>` | Le `<title>` du fichier XHTML se retrouvait sinon dans le texte (titre de chapitre en double) |
| 2 | Supprime `<style>…</style>` et `<script>…</script>` entiers | Évite que le CSS ou le JS apparaissent dans le texte |
| 3 | Tout espace du source (retours à la ligne, tabulations) → un espace | En HTML, un retour à la ligne dans le source n'est qu'un espace. Sinon, les phrases coupées par l'éditeur du fichier se retrouvaient coupées à l'écran (le lecteur affiche en `whitespace-pre-wrap`) |
| 4 | `<em>` / `<i>` → `*texte*` | Conserve l'italique (titres d'œuvres, mots étrangers, emphase). Les espaces de bordure restent hors des astérisques. Un italique qui couvre plusieurs paragraphes n'est pas converti |
| 5 | Fusionne les italiques adjacents (`*El**le*` → `*Elle*`) | Les exports Word découpent souvent un italique en plusieurs balises |
| 6 | `<br>` → `\n` | Conserve les sauts de ligne |
| 7 | Fin de bloc (`</p>`, `</h1>`…`</h6>`, `</div>`, `</li>`, `</blockquote>`…) → `\n\n` | Un paragraphe par bloc. Avant, seul `</p>` comptait : `<h1>Titre</h1><p>Texte</p>` donnait « TitreTexte » |
| 8 | Supprime tous les tags restants | Retire `<strong>`, `<span>`, etc. |
| 9 | Décode les entités nommées, décimales et hexadécimales | `&nbsp;` → espace, `&mdash;` → `—`, `&#160;`, `&#x27;`… |
| 10 | Normalise les espaces insécables résiduels | → espace normal |
| 11 | Supprime les espaces en bord de ligne, réduit les sauts triples | `\n\n\n` → `\n\n` |

### Affichage de l'italique

Le texte est stocké en clair avec la convention `*mot*`. À la lecture, `ReadingText` (`src/components/ReadingText.tsx`) découpe le texte via `splitItalic` (`src/lib/inline-italic.ts`) et rend chaque segment `*…*` dans un `<em>`. Un astérisque isolé (appel de note, séparateur `*`) reste affiché tel quel, et un italique ne traverse jamais un saut de ligne. Les auteurs qui collent leur texte peuvent utiliser la même convention (rappelée sous le champ « Texte » du formulaire).

### Tests et validation sur de vrais livres

`src/lib/epub.test.ts` fabrique des EPUB minimaux en mémoire (`adm-zip`) et vérifie : ordre des chapitres, titre en double supprimé, pages quasi vides ignorées, italique conservé, couverture extraite, fichier invalide rejeté — plus les cas de `stripHtml` (entités, blocs, italiques fragmentés, retours à la ligne du source).

Le 2026-11-14, le parser a aussi été passé sur un échantillon de **60 EPUB réels** (classiques du domaine public : Hugo, Balzac, Dumas, Verne, Conan Doyle, Woolf, la Bible…) : 60 lus sans erreur, 2 010 chapitres, 44 livres avec italique, 50 avec couverture, aucun titre de chapitre en double. C'est ce test qui a révélé les étapes 1, 3, 5 et 7 ci-dessus.

### 3f. Extraction de la couverture

Deux stratégies en cascade :
1. `epub.metadata.cover` — certains EPUBs déclarent l'ID de l'image de couverture dans les métadonnées
2. Recherche dans le manifest : cherche un item dont le `mediaType` commence par `image/` **et** dont l'`id` ou le `href` contient le mot "cover"

Si un ID est trouvé, `epub.getImageAsync(coverId)` retourne un Buffer. Entouré d'un try/catch : l'absence de couverture n'est pas bloquante.

---

## Étape 4 — Upload de la couverture

**Fichier :** `lib/cloudinary.ts` — `uploadCoverBuffer(buffer: Buffer)`

La couverture n'est pas envoyée en base64 dans le JSON — elle est uploadée directement sur Cloudinary depuis le serveur. La route reçoit l'URL publique et la renvoie au client.

Si l'upload échoue (`.catch(() => undefined)`), le champ `coverImageUrl` est absent de la réponse JSON — l'auteur peut alors saisir une URL manuellement ou uploader un fichier séparément.

---

## Format de sortie

Le texte final produit dans le formulaire ressemble à :

```
## Chapitre I — Le matin

Il était une fois…

Deux paragraphes séparés par une ligne vide.

## Chapitre II — Le soir

Un nouveau chapitre commence ici.
```

Ce format avec `##` est ensuite interprété par `parseChapters()` dans `lib/utils.ts` lors de l'affichage de la publication, pour construire l'index de chapitres et la navigation.

---

## Limitations connues

| Problème | Cause | État |
|---|---|---|
| Pages de titre / colophon apparaissent comme chapitres | Le spine inclut toutes les pages, même celles sans titre réel | Atténué par le filtre `< 20 chars`, mais une page de titre de 30 chars passe quand même |
| Ordre des chapitres non garanti en fallback | Le manifest n'a pas d'ordre défini | Acceptable, le fallback est rare |
| Rate limiting absent sur `/api/parse-epub` | La route n'a pas de protection | Un utilisateur pourrait soumettre de nombreux EPUB |
| Store in-memory pour le rate limit global | Resets au redémarrage, ne fonctionne pas multi-instance | Documenté, acceptable pour un démo |
