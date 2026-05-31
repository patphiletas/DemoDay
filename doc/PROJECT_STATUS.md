# 📊 Statut du Projet AlterNative

**Status global**: ✅ Projet complet — déployé en production  
**Date de départ**: 2026-04-27  
**Dernière mise à jour**: 2026-05-27

---

## ✅ Fonctionnalités terminées

### Authentification
- [x] Better Auth configuré (Drizzle adapter, sessions HTTP-only)
- [x] Pages signup / signin
- [x] Server Actions signup / signin / signout avec validation Zod
- [x] Navbar avec état auth
- [x] Routes privées protégées (redirect si non connecté)
- [x] Rate limiting sur signup / signin (5 tentatives / 15 min par IP)

### Soumission de manuscrits
- [x] Page de soumission (`/manuscripts/submit`)
- [x] Formulaire + validation Zod (titre, contenu, catégorie)
- [x] Server Action `submitManuscriptAction`
- [x] Import EPUB : extraction automatique titre, auteur, chapitres (`##`), couverture Cloudinary
- [x] Proposition de couverture par l'auteur à la soumission
- [x] Dashboard perso : manuscrits soumis, statuts, publications acceptées

### Dashboard admin
- [x] Accès restreint par rôle (`role === "admin"`)
- [x] Acceptation de manuscrit → création publication (transaction DB) + notification + email
- [x] Upload d'image de couverture via Cloudinary ou URL externe à l'acceptation
- [x] Édition titre, nom d'auteur, texte du manuscrit avant publication (`editManuscriptContentAction`)
- [x] Mise à jour de la couverture d'une publication existante (`updatePublicationCoverAction`)
- [x] Rejet de manuscrit → raison + notification + email
- [x] Dépublication → suppression publication (ratings + commentaires inclus), retour manuscrit en "submitted" avec pitch et couverture préservés
- [x] Toggle visibilité (masquer/afficher sans dépublier)
- [x] Modération des commentaires (soft delete, restore)

### Publications & interactions
- [x] Homepage avec carousel horizontal des publications (sans limite de nombre)
- [x] Barre de recherche full-text (ILIKE) sur titre, pitch, catégorie, auteur — URL partageable `?q=`
- [x] Route dynamique `/publications/[slug]`
- [x] Navigation précédent / suivant avec défilement infini (wrap)
- [x] Affichage structuré par chapitres avec index sticky dans la barre latérale
- [x] Contrôle A− / A+ pour ajuster la taille du texte principal
- [x] Vue zoomée de la couverture (lightbox, fermeture Échap / clic extérieur)
- [x] Bouton retour en haut de page (`ScrollToTop`)
- [x] Système de notation 1–5 étoiles (upsert via `onConflictDoUpdate`)
- [x] Commentaires avec modération
- [x] Rate limiting sur commentaires (10 / min par utilisateur)

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
- [x] Responsive mobile renforcé (navbar compacte, admin en cartes, lecture mobile, carousel swipe)

### Architecture
- [x] Gardes d'auth partagés (`src/lib/session.ts` — `requireSession`, `requireAdmin`)
- [x] Helpers d'erreurs pour Server Actions (`src/lib/errors.ts`) + page `error.tsx`
- [x] Utilitaires extraits (`src/lib/utils.ts` — `slugify`, `parseChapters`)
- [x] Upload Cloudinary encapsulé (`src/lib/cloudinary.ts` — config lazy, validation type image)
- [x] Parser EPUB serveur (`src/lib/epub.ts` — `epub2`, fallback manifest, extraction couverture)
- [x] Colonne `pitch` ajoutée à `manuscripts` (migration `0002`) — pitch et couverture préservés lors d'une dépublication

### Tests & CI/CD
- [x] Vitest configuré
- [x] Tests de validation Zod + helpers d'erreurs
- [x] GitHub Actions (tests sur chaque push)
- [x] Déploiement Vercel : https://demo-day-wine.vercel.app/

---

## ❌ Non implémenté

- [ ] Middleware global Next.js pour protéger les routes (actuellement garde par page via `session.ts`)
- [ ] Interface utilisateur pour les notifications (table en BDD, insertions présentes, pas d'UI)
- [ ] Interface pour les signalements (table `reports` et `reportSchema` présents, pas d'UI)

---

## 📊 État technique

| Vérification | Statut |
|---|---|
| `npm test -- --run` | ✅ passe |
| `npm run build` | ✅ passe |
| Déploiement Vercel | ✅ live |
| Emails Resend | ✅ opérationnels |
| Cloudinary | ✅ configuré (vars en prod) |
