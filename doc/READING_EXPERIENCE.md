# Expérience de lecture

## Vue d'ensemble

La page de lecture (`/publications/[slug]`) transforme un texte brut en expérience de lecture structurée : chapitres avec index, contrôle de la taille du texte, navigation entre publications, notation et commentaires.

---

## 1. Parsing des chapitres

**Fichier :** `src/lib/utils.ts` — `parseChapters(content)`

Le contenu stocké en base utilise des marqueurs Markdown `##` pour délimiter les chapitres :

```
## Chapitre I — Le matin

Texte du premier chapitre...

## Chapitre II — Le soir

Texte du deuxième chapitre...
```

La fonction split sur le regex `^## (.+)$` en mode multiline :

```ts
export function parseChapters(content: string): Chapter[] {
  const parts = content.split(/^## (.+)$/m);
  if (parts.length < 3) return [];  // pas de ## → texte sans chapitres
  const chapters: Chapter[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    chapters.push({
      title: parts[i].trim(),    // groupe capturé = titre
      content: parts[i + 1]?.trim() ?? "",
    });
  }
  return chapters;
}
```

- Si `parts.length < 3` (moins d'un `##` trouvé) → retourne `[]` → le texte est affiché tel quel sans index
- Le contenu avant le premier `##` est ignoré (`parts[0]`)

**Résultat :** tableau `[{ title: "Chapitre I", content: "Texte..." }, ...]`

---

## 2. Affichage du texte

### Avec chapitres

```tsx
{chapters.map((ch, i) => (
  <section key={i} id={`ch-${i}`} className="scroll-mt-32 space-y-4">
    <h2 className="break-words font-serif-display border-b pb-3 text-2xl font-bold">
      {ch.title}
    </h2>
    <div className="reading-body whitespace-pre-wrap font-serif-display">
      {ch.content}
    </div>
  </section>
))}
```

- `id="ch-0"`, `id="ch-1"`... : ancres pour le scroll depuis l'index
- `scroll-mt-32` : marge de 8rem au scroll pour que le titre ne passe pas sous la barre sticky
- `whitespace-pre-wrap` : préserve les sauts de ligne du texte brut
- `break-words` sur le `<h2>` : les titres longs se coupent proprement

### Sans chapitres

```tsx
<div className="reading-body whitespace-pre-wrap font-serif-display">
  {publication.content}
</div>
```

Le texte brut est affiché directement. Les sauts de ligne sont préservés.

---

## 3. Contrôles de lecture — `ReadingTextControls`

**Fichier :** `src/components/ReadingTextControls.tsx`

Barre `sticky top-14` (juste sous la Navbar) avec deux fonctionnalités :

### Taille du texte (A- / A+)

```ts
const readingSizes = [
  { label: "Compact",  text: "1rem",    line: "1.85" },
  { label: "Confort",  text: "1.125rem", line: "1.9"  },  // défaut (index 1)
  { label: "Large",    text: "1.25rem", line: "1.95" },
];
const [sizeIndex, setSizeIndex] = useState(1);
```

L'index contrôle deux CSS variables injectées sur le wrapper :
```tsx
style={{ "--reading-text-size": currentSize.text, "--reading-line-height": currentSize.line }}
```

Ces variables sont consommées par `.reading-body` dans `globals.css` :
```css
.reading-body {
  font-size: var(--reading-text-size, 1.125rem);
  line-height: var(--reading-line-height, 1.9);
}
```

→ Changer la taille ne provoque pas de re-render du contenu, seulement une mise à jour CSS.

### Dropdown chapitres (mobile + desktop)

```tsx
<details ref={detailsRef} className="group relative">
  <summary>Chap.</summary>
  <ol className="absolute left-0 top-11 z-20 w-[min(78vw,20rem)] ...">
    {chapterLinks.map((chapter) => (
      <a
        href={`#${chapter.id}`}
        onClick={() => { if (detailsRef.current) detailsRef.current.open = false; }}
      >
        {chapter.title}
      </a>
    ))}
  </ol>
</details>
```

- `<details>` natif → pas de JavaScript pour ouvrir/fermer
- `onClick` avec `detailsRef.current.open = false` : ferme le dropdown après un clic sur un lien (comportement par défaut : il restait ouvert)
- Position `absolute` : ne pousse pas le contenu environnant

---

## 4. Index de chapitres (sidebar desktop)

Sur `lg+`, un index sticky apparaît dans la colonne de droite :

```tsx
<section className="editorial-surface hidden space-y-3 rounded-lg p-5 lg:block">
  <p className="editorial-label">Chapitres</p>
  <ol className="max-h-56 space-y-1 overflow-y-auto">
    {chapters.map((ch, i) => (
      <a href={`#ch-${i}`} className="block text-sm hover:underline">
        {ch.title}
      </a>
    ))}
  </ol>
</section>
```

- `hidden lg:block` → masqué sur mobile (le dropdown de la barre sticky prend le relais)
- `max-h-56 overflow-y-auto` → scrollable si beaucoup de chapitres
- `sticky top-24` sur l'`<aside>` : la sidebar reste visible pendant la lecture

---

## 5. Navigation entre publications

La page charge 4 publications pour la navigation avec wrap circulaire :

```ts
const [prevDirect, nextDirect, firstPublication, lastPublication] = await Promise.all([
  // Précédent direct : id inférieur le plus proche
  db.select().where(lt(publications.id, publication.id)).orderBy(desc(publications.id)).limit(1),
  // Suivant direct : id supérieur le plus proche
  db.select().where(gt(publications.id, publication.id)).orderBy(asc(publications.id)).limit(1),
  // Premier (pour wrap depuis le début)
  db.select().where(ne(publications.id, publication.id)).orderBy(asc(publications.id)).limit(1),
  // Dernier (pour wrap depuis la fin)
  db.select().where(ne(publications.id, publication.id)).orderBy(desc(publications.id)).limit(1),
]);

const previousPublication = prevDirect ?? lastPublication;  // wrap circulaire
const nextPublication = nextDirect ?? firstPublication;
```

→ On est sur la première publication : "Précédent" pointe vers la dernière  
→ On est sur la dernière publication : "Suivant" pointe vers la première

Seules les publications `isVisible = true` sont incluses dans toutes ces requêtes.

---

## 6. Notation

Formulaire de 5 boutons `★` (1-5) soumis individuellement :

```tsx
<form action={ratePublicationAction}>
  <input type="hidden" name="publicationId" value={publication.id} />
  {[1, 2, 3, 4, 5].map((score) => (
    <button type="submit" name="score" value={score}
      className={score <= userRating?.score ? "accent-chip" : "..."}>
      ★
    </button>
  ))}
</form>
```

- Chaque bouton soumet le formulaire avec la valeur `score`
- Les étoiles jusqu'à la note actuelle de l'utilisateur sont colorées (`accent-chip`)
- `ratePublicationAction` fait un `INSERT ... ON CONFLICT DO UPDATE` → noter une deuxième fois remplace la première note

---

## 7. Commentaires

Formulaire textarea + bouton "Publier" :

```tsx
<form action={commentPublicationAction}>
  <input type="hidden" name="publicationId" value={publication.id} />
  <textarea name="content" rows={3} maxLength={500} required />
  <button type="submit">Publier</button>
</form>
```

Les commentaires avec `isDeleted = true` sont exclus de la liste affichée :
```ts
.where(and(eq(comments.publicationId, publication.id), eq(comments.isDeleted, false)))
```

---

## 8. Lightbox couverture

**Fichier :** `src/components/CoverZoom.tsx`

Un clic sur la couverture ouvre un overlay `position:fixed inset-0` avec l'image agrandie. Fermeture possible par :
- Clic sur le fond (overlay)
- Clic sur le bouton ✕
- Touche `Échap` (via `addEventListener("keydown", ...)` dans un `useEffect`)

L'image dans la lightbox est contrainte par `max-h-[90dvh] max-w-[90dvw]` — s'adapte à la taille de l'écran.

---

## Layout mobile vs desktop

| Élément | Mobile | Desktop (lg+) |
|---|---|---|
| Couverture | Centrée, `max-w-64` | Colonne gauche `280px` |
| Métadonnées | Sous la couverture | Colonne droite |
| Article + sidebar | Une colonne, article en premier | Deux colonnes `[1fr_340px]` |
| Index chapitres | Dropdown dans la barre sticky | Sidebar fixe `lg:block` |
| Barre de contrôles | Sticky `top-14` | Sticky `top-14` |
