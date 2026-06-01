# Design system — Tokens, classes et conventions

## Fichier source

Tout le design system est défini dans `src/app/globals.css`. Tailwind CSS v4 est utilisé avec une syntaxe spécifique.

---

## Tokens CSS (variables CSS custom)

### Palette principale

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `--background` | `#f7f5ef` (crème) | `#14110f` (quasi-noir) | Fond de page global |
| `--foreground` | `#181411` | `#f5efe6` | Couleur de texte globale |
| `--paper` | `#fffdf8` (blanc chaud) | `#1d1916` | Fond des surfaces (cartes, inputs) |
| `--paper-muted` | `#efebe2` | `#28231f` | Fond des surfaces secondaires |
| `--ink` | `#181411` | `#f5efe6` | Texte principal |
| `--ink-soft` | `#5f574f` | `#c6b9aa` | Texte secondaire / muted |
| `--line` | `#ded6ca` | `#3c342e` | Bordures, séparateurs |
| `--accent` | `#b7352d` (rouge bordeaux) | `#e15a4f` | Actions primaires, labels, focus |
| `--accent-dark` | `#7f211c` | `#ff8a7f` | Hover des éléments accent |
| `--sage` | `#4f6f64` (vert sauge) | `#8fb4a5` | Badges "succès", statut accepté |
| `--blueprint` | `#2d536f` (bleu ardoise) | `#8db4d1` | Liens, badge "Nouveauté" |

### Utilisation dans Tailwind v4

La syntaxe canonique utilise les parenthèses et le double tiret :

```html
<!-- ✅ Correct (Tailwind v4) -->
<p class="text-(--ink) bg-(--paper) border-(--line)">

<!-- ❌ Ancien style (à éviter) -->
<p class="text-[color:var(--ink)]">
```

Les tokens sont aussi utilisables directement dans les styles inline et les classes CSS custom :
```css
.ma-classe {
  color: var(--ink);
  background: var(--paper);
}
```

---

## Mode sombre

Le mode sombre utilise la classe `.dark` sur `<html>` (pas `prefers-color-scheme` seul).

```css
/* Tous les tokens sont redéfinis dans :root.dark */
:root.dark {
  --background: #14110f;
  --ink: #f5efe6;
  /* ... */
}
```

**Pourquoi `.dark` et pas le media query ?**
L'utilisateur peut basculer manuellement via `ThemeToggle`. Le choix est persisté dans `localStorage`. Un script inline dans `layout.tsx` applique la classe avant le premier rendu pour éviter le flash.

**Variant Tailwind :**
```css
@variant dark (&:where(.dark, .dark *));
```
S'utilise comme `dark:bg-(--paper-muted)` dans les classes Tailwind.

---

## Typographie

| Classe | Police | Usage |
|---|---|---|
| (défaut) | Inter → system-ui → sans-serif | Corps de texte, UI |
| `.font-serif-display` | Georgia → "Times New Roman" → serif | Titres, texte de lecture, accroches |

La police serif est appliquée manuellement aux éléments éditoriaux — elle n'est pas la police par défaut du body.

**Texture de fond :** un quadrillage subtil est appliqué via `body::before` (pseudo-élément en `position: fixed`, `opacity: 0.42`, `pointer-events: none`). Il simule un papier légèrement tramé.

---

## Composants CSS custom

### Layouts

| Classe | CSS | Usage |
|---|---|---|
| `.page-shell` | `min-height: 100vh; padding: 1.25rem 1rem` (2.5rem 1.5rem sur sm+) | Wrapper de toutes les pages |
| `.container-editorial` | `max-width: 72rem; margin-inline: auto; width: 100%` | Conteneur centré du contenu |

### Surfaces

| Classe | Rendu | Usage |
|---|---|---|
| `.editorial-surface` | Fond `--paper` légèrement transparent + bordure + ombre | Cartes, panneaux principaux |
| `.editorial-panel` | Fond `--paper-muted` / `--paper` mixé + bordure | Panneaux secondaires (dashboard) |

### Texte

| Classe | CSS | Usage |
|---|---|---|
| `.editorial-label` | `text-xs font-bold uppercase color: --accent` | Labels de section, catégories |
| `.editorial-muted` | `color: --ink-soft` | Texte secondaire, métadonnées |

### Boutons

| Classe | Style | Usage |
|---|---|---|
| `.btn-primary` | Fond `--ink`, texte `--paper`, hover fond `--accent-dark` | Action principale |
| `.btn-secondary` | Fond `--paper`, bordure `--line`, hover bordure `--accent` | Action secondaire, navigation |

Les deux ont `min-height: 2.5rem` pour respecter les cibles tactiles.

### Formulaires

| Classe | CSS | Usage |
|---|---|---|
| `.field` | `width: 100%; border: 1px solid --line; background: --paper; outline: none` | Tous les inputs, selects, textareas |
| `.field:focus` | Bordure `--accent` + ring `color-mix(accent 16%)` | Focus visible |

### Badges (chips)

| Classe | Couleur | Usage |
|---|---|---|
| `.accent-chip` | Rouge bordeaux atténué | Statut accent, boutons d'action légers |
| `.sage-chip` | Vert sauge atténué | Statut "Visible", "Accepté" |
| `.new-chip` | Bleu ardoise atténué | Badge "Nouveauté" (< 7 jours) |
| `.muted-chip` | `--paper-muted` | Statut neutre, "Masquée" |

### Divers

| Classe | CSS | Usage |
|---|---|---|
| `.rule` | `border-color: var(--line)` | Séparateurs avec la bonne couleur |
| `.reading-body` | `font-size: var(--reading-text-size, 1.125rem); line-height: var(--reading-line-height, 1.9); overflow-wrap: break-word` | Corps du texte en lecture |

---

## Cards de publication

Les cards du carousel ont des classes dédiées pour permettre la vue compacte via CSS pur :

| Classe | CSS | Usage |
|---|---|---|
| `.publication-card` | `width: min(78vw, 230px)` (280px sur sm+) | Dimension de la carte |
| `.publication-card-cover` | `aspect-ratio: 4/5` | Couverture portrait |
| `.publication-card-body` | — | Corps de la carte |
| `.publication-card-pitch` | — | Accroche (masquée en vue compacte) |
| `.publication-card-comments` | — | Commentaires (masqués en vue compacte) |

**Vue compacte** (checkbox CSS hack) :
```css
.compact-toggle:checked ~ .publication-feed .publication-card {
  width: 210px;  /* plus étroit */
}
.compact-toggle:checked ~ .publication-feed .publication-card-pitch,
.compact-toggle:checked ~ .publication-feed .publication-card-comments {
  display: none;
}
```
Un `<input type="checkbox" class="compact-toggle sr-only">` dans le DOM + un `<label for="...">` permettent de basculer sans JavaScript.

---

## Variables CSS dynamiques (lecture)

`ReadingTextControls` injecte deux variables CSS via le style inline du composant :

| Variable | Valeurs disponibles | Valeur par défaut |
|---|---|---|
| `--reading-text-size` | `1rem` / `1.125rem` / `1.25rem` | `1.125rem` (Confort) |
| `--reading-line-height` | `1.85` / `1.9` / `1.95` | `1.9` |

Ces variables sont consommées par la classe `.reading-body`.

---

## Conventions à respecter

1. **Toujours utiliser les tokens** plutôt que des couleurs brutes — le mode sombre est géré automatiquement
2. **Syntaxe Tailwind v4** : `text-(--ink)` et non `text-[color:var(--ink)]`
3. **Pas de `outline: none`** sans alternative visible — `.field:focus` fournit un ring accessible
4. **`min-height: 2.5rem`** (Tailwind : `min-h-10`) sur tous les éléments interactifs mobiles
5. **Serif pour le contenu éditorial**, sans-serif pour l'UI
