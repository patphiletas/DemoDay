# Mode jour / nuit

## Vue d'ensemble

Le mode sombre repose sur trois mécanismes qui s'enchaînent :

```
1. Script inline dans layout.tsx    ← applique .dark AVANT le premier rendu (anti-flash)
         ↓
2. CSS variables dans globals.css   ← :root.dark redéfinit tous les tokens
         ↓
3. ThemeToggle.tsx                  ← bascule .dark + localStorage au clic utilisateur
```

---

## Fichiers impliqués

| Fichier | Rôle |
|---|---|
| `src/app/layout.tsx` | Script inline d'initialisation (avant rendu) |
| `src/app/globals.css` | Tokens CSS pour le mode clair et sombre |
| `src/components/ThemeToggle.tsx` | Bouton de bascule dans la Navbar |
| `src/components/theme-provider.tsx` | ⚠️ Fichier présent mais **non utilisé** (dead code, vestige de next-themes) |

---

## 1. Initialisation sans flash

**Fichier :** `layout.tsx`

```tsx
<html lang="fr" className="h-full antialiased" suppressHydrationWarning>
  <body>
    <script dangerouslySetInnerHTML={{ __html: `
      (function() {
        var stored = localStorage.getItem('theme');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (stored === 'dark' || (!stored && prefersDark)) {
          document.documentElement.classList.add('dark');
        }
      })();
    `}} />
    ...
  </body>
</html>
```

Ce script s'exécute **de façon synchrone avant que le navigateur ne peigne quoi que ce soit**. Il lit deux sources pour décider le thème initial :

| Priorité | Source | Condition |
|---|---|---|
| 1 | `localStorage('theme')` | Si `=== 'dark'` → mode sombre |
| 2 | `prefers-color-scheme: dark` | Si pas de préférence sauvegardée et l'OS est en sombre |
| — | Défaut | Mode clair si aucune des deux conditions |

**Pourquoi `dangerouslySetInnerHTML` ?**  
Next.js n'autorise pas de `<script>` enfant dans JSX sans cette prop. C'est la seule façon de garantir l'exécution synchrone avant le rendu.

**Pourquoi `suppressHydrationWarning` sur `<html>` ?**  
Le script peut ajouter la classe `.dark` sur `<html>` avant l'hydratation React. Sans cette prop, React détecterait une différence entre le HTML serveur (sans `.dark`) et le DOM après le script (avec `.dark`) et logguerait un avertissement.

---

## 2. Les tokens CSS

**Fichier :** `globals.css`

Deux jeux de variables — l'un pour le mode clair (`:root`), l'autre pour le mode sombre (`:root.dark`) :

```css
:root {
  --background: #f7f5ef;   /* crème */
  --paper:      #fffdf8;   /* blanc chaud */
  --paper-muted:#efebe2;
  --ink:        #181411;   /* quasi-noir chaud */
  --ink-soft:   #5f574f;
  --line:       #ded6ca;
  --accent:     #b7352d;   /* rouge bordeaux */
  --accent-dark:#7f211c;
  --sage:       #4f6f64;   /* vert sauge */
  --blueprint:  #2d536f;   /* bleu ardoise */
}

:root.dark {
  --background: #14110f;
  --paper:      #1d1916;
  --paper-muted:#28231f;
  --ink:        #f5efe6;   /* crème clair */
  --ink-soft:   #c6b9aa;
  --line:       #3c342e;
  --accent:     #e15a4f;   /* rouge plus lumineux */
  --accent-dark:#ff8a7f;
  --sage:       #8fb4a5;
  --blueprint:  #8db4d1;
}
```

Quand `.dark` est présent sur `<html>`, **toutes** les couleurs basculent automatiquement. Aucun composant n'a besoin de gérer le thème individuellement — ils utilisent tous `var(--ink)`, `var(--paper)`, etc.

**Le variant Tailwind :**
```css
@variant dark (&:where(.dark, .dark *));
```
Permet d'utiliser `dark:` dans les classes Tailwind : `dark:bg-(--paper-muted)`, `dark:text-(--ink-soft)`, etc. Ce variant cible `.dark` et tous ses descendants (et non `@media prefers-color-scheme`).

---

## 3. Le bouton ThemeToggle

**Fichier :** `ThemeToggle.tsx`

### État React avec `useSyncExternalStore`

```ts
const dark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false);
```

`useSyncExternalStore` est le hook React pour lire un store externe (ici : le DOM + `localStorage`). Il prend trois arguments :

| Argument | Fonction | Ce qu'il fait ici |
|---|---|---|
| `subscribeTheme` | S'abonner aux changements | Écoute `"themechange"` et `"storage"` |
| `getThemeSnapshot` | Lire l'état actuel (client) | `document.documentElement.classList.contains("dark")` |
| `() => false` | Snapshot serveur (SSR) | Retourne `false` (mode clair par défaut côté serveur) |

→ `dark` est `true` si `.dark` est présent sur `<html>`, `false` sinon.

### La fonction `toggle()`

```ts
function toggle() {
  const next = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", next);  // ajoute ou retire .dark
  localStorage.setItem("theme", next ? "dark" : "light");   // persiste le choix
  window.dispatchEvent(new Event("themechange"));            // notifie useSyncExternalStore
}
```

L'ordre est important :
1. Calcule le **nouvel** état avant de modifier le DOM
2. Modifie le DOM (`.dark` sur `<html>`)
3. Persiste dans `localStorage`
4. Dispatche `"themechange"` pour que `useSyncExternalStore` relise le snapshot et re-rende le bouton

### L'icône

```tsx
{dark ? <SunIcon /> : <MoonIcon />}
```

- Mode sombre activé → affiche le soleil (pour repasser en mode clair)
- Mode clair → affiche la lune (pour passer en mode sombre)

### Synchronisation multi-onglets

```ts
function subscribeTheme(onStoreChange: () => void) {
  window.addEventListener("themechange", onStoreChange);  // même onglet
  window.addEventListener("storage", onStoreChange);      // autres onglets
  return () => { /* cleanup */ };
}
```

L'événement `"storage"` est déclenché par le navigateur quand `localStorage` est modifié **depuis un autre onglet**. Cela signifie que si l'utilisateur change le thème dans un onglet, le bouton se met à jour dans tous les autres onglets ouverts.

---

## Flux complet au premier chargement

```
1. Navigateur reçoit le HTML du serveur
   → <html> sans .dark
   → <script> inline présent dans le <body>

2. Navigateur parse et exécute le script inline (synchrone, avant rendu)
   → lit localStorage('theme')
   → si 'dark' ou prefers-color-scheme → ajoute .dark sur <html>

3. Navigateur peint la page
   → tokens CSS :root.dark actifs si .dark présent
   → pas de flash de couleur

4. React s'hydrate
   → ThemeToggle monte, useSyncExternalStore lit l'état courant du DOM
   → affiche Soleil ou Lune selon l'état réel
   → suppressHydrationWarning évite les warnings React
```

---

## Flux au clic sur le bouton

```
Utilisateur clique ThemeToggle
  → toggle()
      → classList.toggle("dark")        → tous les tokens basculent instantanément
      → localStorage.setItem(...)       → persisté pour les prochains chargements
      → dispatchEvent("themechange")    → useSyncExternalStore re-lit le snapshot
          → dark = !dark
          → bouton re-rende (Soleil ↔ Lune)
```

---

## Dead code — `theme-provider.tsx`

```tsx
// Ce fichier N'EST PAS importé dans layout.tsx ni ailleurs
import { ThemeProvider } from "next-themes";

export function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
```

Ce fichier est un vestige d'une implémentation précédente avec `next-themes`. Il n'est importé nulle part. Le système actuel (script inline + `useSyncExternalStore`) le remplace entièrement et n'a pas besoin de ce provider.

> Il peut être supprimé sans impact. `next-themes` peut aussi être retiré des dépendances si ce fichier est supprimé.

---

## Résumé des responsabilités

| Mécanisme | Responsabilité |
|---|---|
| Script inline `layout.tsx` | Applique le bon thème **avant** le premier pixel peint → pas de flash |
| `:root.dark` dans `globals.css` | Redéfinit les tokens → toute l'UI bascule automatiquement |
| `ThemeToggle` + `useSyncExternalStore` | Permet à l'utilisateur de changer, synchronise l'icône, multi-onglets |
| `localStorage('theme')` | Persiste le choix entre les sessions |
| `prefers-color-scheme` | Respecte la préférence système si aucun choix explicite |
