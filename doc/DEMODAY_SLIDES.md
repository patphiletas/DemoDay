# Slides Démo Day — AlterNative

---

## Slide 1 — Titre

# AlterNative
**Revue littéraire collaborative indépendante**

*Patrice Philetas — ADA Démo Day — Juin 2026*

---

## Slide 2 — Contexte

### Le projet

- Plateforme de soumission et publication de manuscrits
- 3 rôles : **visiteur · auteur · admin**
- Les auteurs soumettent → les admins acceptent/refusent → ça devient une publication lisible

---

## Slide 3 — Stack

### Technologies

- Next.js 15 App Router · TypeScript
- PostgreSQL · Drizzle ORM
- Better Auth · Cloudinary · Resend
- Tailwind CSS v4

---

## Slide 4 — Démo : côté auteur

### Parcours auteur

1. Création de compte
2. Soumission : titre, synopsis, couverture, fichier EPUB
3. Attente de validation admin

---

## Slide 5 — Démo : côté admin

### Parcours admin

1. Dashboard — manuscrits en attente
2. **Accepter** → publication créée automatiquement
3. **Refuser** → email envoyé à l'auteur

---

## Slide 6 — Démo : côté lecteur

### Parcours lecteur

- Navigation entre les publications
- Lecture chapitre par chapitre
- Note (1-5 étoiles) + commentaires

---

## Slide 7 — Dans le code : parser EPUB

### Fonctionnalité : parsing EPUB

- Un EPUB = une archive ZIP contenant du HTML
- Librairie `epub2` + parsing custom
- Challenge : retourne parfois une `string`, parfois un tuple `[content, mime]`

```ts
const raw = await epub.getChapterRaw(id);
const html = Array.isArray(raw) ? raw[0] : raw;
```

---

## Slide 8 — Bilan

### Réussites
- Auth complète avec rôles
- Workflow manuscrit de bout en bout
- Parser EPUB fonctionnel

### Difficultés
- Next.js 15 : `params` / `searchParams` en `Promise` (breaking change)
- `epub2` : comportement non documenté

### Axes d'amélioration
- UI notifications et signalements
- Middleware global Next.js

---

## Slide 9 — Merci

# Questions ?

[github.com/patphiletas](https://github.com/patphiletas)
[linkedin.com/in/patricephiletas](https://linkedin.com/in/patricephiletas)
