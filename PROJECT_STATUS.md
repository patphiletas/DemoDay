# 📊 Statut du Projet AlterNative

**Status global**: ✅ Projet complet — déployé en production  
**Date de départ**: 2026-04-27  
**Dernière mise à jour**: 2026-05-19

---

## ✅ Fonctionnalités terminées

### Authentification
- [x] Better Auth configuré (Drizzle adapter, sessions HTTP-only)
- [x] Pages signup / signin
- [x] Server Actions signup / signin / signout avec validation Zod
- [x] Navbar avec état auth
- [x] Routes privées protégées (redirect si non connecté)

### Soumission de manuscrits
- [x] Page de soumission (`/manuscripts/submit`)
- [x] Formulaire + validation Zod (titre, contenu, catégorie)
- [x] Server Action `submitManuscriptAction`
- [x] Dashboard perso : manuscrits soumis, statuts, publications acceptées

### Dashboard admin
- [x] Accès restreint par rôle (`role === "admin"`)
- [x] Acceptation de manuscrit → création publication + notification + email
- [x] Rejet de manuscrit → raison + notification + email
- [x] Dépublication / toggle visibilité
- [x] Modération des commentaires (soft delete, restore)
- [x] Gestion des signalements (reports)

### Publications & interactions
- [x] Homepage avec carousel horizontal des publications
- [x] Route dynamique `/publications/[slug]`
- [x] Système de notation 1–5 étoiles (unique par user)
- [x] Commentaires avec modération
- [x] Signalement de commentaires

### Emails transactionnels (Resend)
- [x] Email de bienvenue à l'inscription
- [x] Email d'acceptation de manuscrit (avec note éditoriale + lien publication)
- [x] Email de refus de manuscrit (avec raison)

### Notifications in-app
- [x] Table `notifications` en BDD
- [x] Notifications créées à l'acceptation / refus

### UX & accessibilité
- [x] Mode sombre (ThemeToggle + `prefers-color-scheme` + Tailwind `dark:`)
- [x] Pas de flash au chargement

### Tests & CI/CD
- [x] Vitest configuré
- [x] Tests de validation Zod
- [x] GitHub Actions (lint + tests sur chaque push)
- [x] Déploiement Vercel : https://demo-day-wine.vercel.app/

---

## ❌ Non implémenté

- [ ] Recherche & filtres (`/search?q=...`)
- [ ] Page `error.tsx` + classes d'erreurs centralisées (`src/lib/errors.ts`)

---

## 📊 État technique

| Vérification | Statut |
|---|---|
| `npm test -- --run` | ✅ passe |
| `npm run build` | ✅ passe |
| Déploiement Vercel | ✅ live |
| Emails Resend | ✅ opérationnels |
