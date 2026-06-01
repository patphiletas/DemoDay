# Vue compacte — Fonctionnement

## Vue d'ensemble

La vue compacte est un mode d'affichage alternatif du carousel de publications sur la homepage. Elle réduit les cartes et masque le pitch et les commentaires pour afficher plus de titres dans le même espace.

Elle fonctionne **sans JavaScript** via une technique CSS pur appelée "checkbox hack".

---

## Le mécanisme : checkbox hack

L'idée : un `<input type="checkbox">` invisible sert d'interrupteur d'état. Son état `:checked` est détecté par des sélecteurs CSS pour modifier les éléments frères et descendants.

```
[input#compact-publications.compact-toggle] ← interrupteur (sr-only, invisible)
         ↓ sibling combinator (~)
[div.publication-feed]
    ↓ descendant
[article.publication-card]
[div.publication-card-cover]
[div.publication-card-body]
[p.publication-card-pitch]        ← masqué en mode compact
[span.publication-card-comments]  ← masqué en mode compact
```

---

## Structure HTML dans `page.tsx`

```tsx
<section className="space-y-6">
  {/* Interrupteur — invisible mais dans le DOM */}
  <input
    id="compact-publications"
    type="checkbox"
    className="compact-toggle peer sr-only"
  />

  <div className="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h2>Dernières publications</h2>
      <p>Sous-titre</p>
      {/* Déclencheur — clique sur l'input via htmlFor */}
      <label
        htmlFor="compact-publications"
        className="mt-2 inline-block cursor-pointer select-none
                   rounded-md border border-(--line) px-3 py-1.5
                   text-xs font-semibold editorial-muted
                   hover:border-(--accent) hover:text-(--ink)"
      >
        Vue compacte
      </label>
    </div>
    <SearchBar />
  </div>

  {/* Cible des règles CSS */}
  <div className="publication-feed">
    <HorizontalScroll>
      <PublicationCard ... />  {/* article.publication-card */}
    </HorizontalScroll>
  </div>
</section>
```

**Pourquoi le `<input>` est avant le `<div>` de titre ?**  
Le sélecteur CSS `~` (sibling général) ne fonctionne que vers les éléments **suivants** dans le DOM. Le `<input>` doit donc être placé **avant** la `.publication-feed` dans l'arbre HTML.

**`sr-only`** : la classe Tailwind `sr-only` rend l'input invisible visuellement (`position: absolute; width: 1px; height: 1px; overflow: hidden; clip: ...`) tout en le laissant accessible aux lecteurs d'écran et fonctionnel pour le `<label>`.

---

## Les règles CSS dans `globals.css`

### État normal (mode standard)

```css
.publication-card {
  width: min(78vw, 230px);   /* mobile : 78% viewport, desktop : 230px */
  flex-shrink: 0;
}

.publication-card-cover {
  aspect-ratio: 4 / 5;       /* portrait */
}

@media (min-width: 640px) {
  .publication-card {
    width: 280px;             /* plus larges sur sm+ */
  }
}
```

### État compact (`.compact-toggle:checked`)

```css
/* Largeur réduite */
.compact-toggle:checked ~ .publication-feed .publication-card {
  width: 210px;
}

/* Couverture carrée (moins haute) */
.compact-toggle:checked ~ .publication-feed .publication-card-cover {
  aspect-ratio: 1 / 1;
}

/* Padding réduit dans le corps de la carte */
.compact-toggle:checked ~ .publication-feed .publication-card-body {
  padding: 0.75rem;
}

/* Pitch et commentaires masqués */
.compact-toggle:checked ~ .publication-feed .publication-card-pitch,
.compact-toggle:checked ~ .publication-feed .publication-card-comments {
  display: none;
}

@media (min-width: 640px) {
  .compact-toggle:checked ~ .publication-feed .publication-card {
    width: 230px;             /* un peu plus larges sur sm+ */
  }
}
```

---

## Les classes sur `PublicationCard`

Chaque élément de la carte a une classe sémantique qui sert de cible CSS :

| Classe | Élément | Mode compact |
|---|---|---|
| `publication-card` | `<article>` racine | Largeur réduite |
| `publication-card-cover` | `<Link>` autour de l'image | Ratio 1:1 au lieu de 4:5 |
| `publication-card-body` | `<div>` corps texte | Padding réduit |
| `publication-card-pitch` | `<p>` accroche | `display: none` |
| `publication-card-comments` | `<span>` nb commentaires | `display: none` |

---

## Comparaison visuelle

| Élément | Mode standard | Mode compact |
|---|---|---|
| Largeur carte (mobile) | `min(78vw, 230px)` | `210px` |
| Largeur carte (sm+) | `280px` | `230px` |
| Ratio couverture | `4:5` (portrait) | `1:1` (carré) |
| Padding corps | `p-4` (1rem) | `0.75rem` |
| Pitch affiché | ✅ `line-clamp-2` | ❌ masqué |
| Commentaires affichés | ✅ | ❌ masqués |

---

## Ce qui manque / limitations

| Sujet | Situation actuelle |
|---|---|
| **Pas d'état visuel "actif"** | Le label "Vue compacte" ne change pas d'apparence quand le mode est activé. Cause : le `<label>` est un descendant d'un frère de l'`<input>`, le sélecteur `peer-checked:` de Tailwind ne peut pas l'atteindre depuis cet endroit dans le DOM |
| **Pas de persistance** | La case est décochée à chaque rechargement de page (état navigateur non sauvegardé) |
| **Pas d'animation** | Le changement de taille est immédiat, sans transition |

### Pourquoi `peer-checked:` ne fonctionne pas ici

Tailwind `peer` fonctionne uniquement entre **siblings directs** : l'élément stylisté doit être un frère direct de l'input `.peer`. Dans notre structure, le `<label>` est imbriqué plusieurs niveaux plus bas dans un `<div>` qui est lui-même un frère de l'input. Tailwind ne peut pas cibler un descendant d'un frère via le mécanisme `peer`.

**Solution possible :** utiliser un sélecteur CSS custom dans `globals.css` :
```css
.compact-toggle:checked ~ div label[for="compact-publications"] {
  /* style "actif" */
  border-color: var(--accent);
  color: var(--ink);
}
```

Ou déplacer le `<label>` pour en faire un sibling direct de l'input et utiliser `order` CSS pour le replacer visuellement.
