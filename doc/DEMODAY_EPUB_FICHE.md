# Fiche présentation — Import EPUB

## Ce que ça fait (en une phrase)

L'utilisateur uploade un `.epub` → l'app extrait automatiquement le titre, l'auteur, le contenu structuré en chapitres et la couverture → les champs du formulaire sont pré-remplis.

---

## Le flux en 4 étapes

```
[Input file]
    → POST /api/parse-epub
        → parseEpub()         (lib/epub.ts)
            → uploadCoverBuffer()  (lib/cloudinary.ts)
    ← JSON { title, author, content, coverImageUrl }
← Formulaire pré-rempli
```

**1. Client** — L'utilisateur choisit un `.epub`. Le formulaire l'envoie en `FormData` à la route API. Pendant l'envoi : spinner "Extraction en cours…"

**2. Route API** — Valide l'extension et la taille (max 20 Mo). Orchestre le parsing et l'upload de couverture.

**3. Parser** (`lib/epub.ts`) — Écrit le fichier sur disque dans `/tmp/` (epub2 ne lit pas un Buffer directement), extrait les métadonnées, parcourt le **spine** (liste ordonnée des chapitres), nettoie le HTML avec `stripHtml()`, récupère l'image de couverture.

**4. Cloudinary** — La couverture est uploadée côté serveur. L'URL publique est renvoyée au client. Si l'upload échoue, ce n'est pas bloquant.

---

## Le détail technique à montrer

### Comportement non documenté de epub2

```ts
// epub2 retourne parfois une string, parfois un tuple [content, mime]
const raw = await epub.getChapterRaw(id);
const html = Array.isArray(raw) ? raw[0] : raw;
```

Découvert en production sur certains fichiers EPUB — pas dans la doc de la lib.

### stripHtml() — ordre des opérations important

1. Supprimer `<style>` et `<script>` entiers
2. `<br>` → `\n`, `</p>` → `\n\n`
3. Supprimer tous les tags restants
4. Décoder les entités HTML (`&nbsp;`, `&#160;`, `&#x27;`…)
5. Normaliser les espaces et sauts de ligne

### Déduplication automatique des titres

Beaucoup d'EPUBs répètent le titre du chapitre dans le corps du texte.
Si la première ligne du contenu correspond au titre → elle est supprimée.

---

## Format de sortie

```
## Chapitre I — Le matin

Il était une fois…

## Chapitre II — Le soir

Un nouveau chapitre commence ici.
```

Ce format `##` est ensuite lu par `parseChapters()` pour construire la navigation par chapitres.

---

## Q&A — Questions probables des devs

**Q : Pourquoi passer par un fichier `/tmp/` plutôt que lire le Buffer directement ?**
> epub2 n'expose pas d'API pour lire depuis un Buffer en mémoire — elle n'accepte qu'un chemin disque. Le fichier est supprimé dans le bloc `finally`, même en cas d'erreur.

**Q : Pourquoi utiliser `ref` plutôt que `useState` pour pré-remplir les champs titre/auteur ?**
> Pour éviter un re-render complet du formulaire (qui contient aussi le textarea du contenu et l'aperçu couverture). Les `ref` permettent de modifier la valeur du DOM directement sans déclencher React.

**Q : Qu'est-ce qui se passe si l'EPUB n'a pas de spine ?**
> Fallback sur le manifest : on parcourt tous les items HTML/XHTML. L'ordre n'est pas garanti et il peut y avoir des doublons, mais ça reste lisible.

**Q : Pourquoi uploader la couverture sur Cloudinary côté serveur et pas côté client ?**
> Les clés API Cloudinary ne doivent pas être exposées au navigateur. L'upload signé se fait uniquement depuis le serveur.

**Q : Qu'est-ce qui se passe si l'EPUB fait plus de 20 Mo ?**
> La route retourne un HTTP 413. Le client affiche une erreur sous le champ fichier.

**Q : Il y a un rate limiting sur cette route ?**
> Non, c'est une limitation connue. Pour un démo c'est acceptable, en production il faudrait ajouter un rate limit par IP ou par utilisateur.

**Q : Est-ce que ça gère tous les formats EPUB (v2, v3) ?**
> epub2 gère les deux, mais le parsing est optimisé pour EPUB 2. Certains EPUB 3 avec des fonctionnalités avancées (scripts, media overlays) peuvent perdre des éléments au nettoyage — c'est voulu, on veut du texte brut.
