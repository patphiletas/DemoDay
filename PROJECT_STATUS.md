# 📊 Statut du Projet Alternative

**Status global**: ⏳ Fondations terminées, auth en place, métier à démarrer  
**Semaine**: Jour 3-5 terminé / prêt pour Jour 6-8  
**Date de départ**: 2026-04-27
**Dernière mise à jour**: 2026-05-06

---

## 🎯 Semaine 1: Fondations & Auth

### Jour 1-2: Initialisation ✅
- [x] Projet Next.js créé
- [x] Dépendances installées
- [x] Drizzle ORM configuré
- [x] Schéma BDD défini
- [x] Zod schemas créés
- [x] Structure de dossiers mise en place

**À faire avant le jour 3**:
- [x] BDD PostgreSQL (Neon) créée
- [x] `.env.local` complété avec DATABASE_URL
- [x] Migrations générées et appliquées

### Jour 3-5: Authentification Better Auth
- [x] Better Auth configuré
- [x] Route API `/api/auth/[...auth]` créée
- [x] Pages signup/signin créées
- [x] Server Actions pour signup/signin/signout
- [x] Cookies de session transmis après auth
- [x] Redirections après signup/signin/signout
- [ ] Navbar avec état auth
- [ ] Protection des routes privées

---

## 📝 Jour 6-8: Soumission de manuscrits
- [ ] Page de soumission créée
- [ ] Formulaire + Zod validation
- [ ] Server Action submitManuscript
- [ ] Page "Mes soumissions"

---

## 👨‍⚖️ Jour 9-10: Admin Dashboard
- [ ] Middleware de protection admin
- [ ] Dashboard admin
- [ ] Route dynamique [id] pour review
- [ ] Accept/Reject Server Actions
- [ ] [BONUS] Appel IA pour catégorie & pitch

---

## 📚 Semaine 3: Publications & Commentaires

### Jour 11-13
- [ ] Accueil avec liste publications
- [ ] Route dynamique [slug]
- [ ] Formulaire commentaires
- [ ] Système de notation
- [ ] Agrégation note moyenne

### Jour 14-15: Gestion d'erreurs
- [ ] Classes d'erreurs custom
- [ ] Page error.tsx
- [ ] Gestion d'erreurs dans Server Actions

---

## 🔍 Semaine 4: Recherche, Tests & Deploy

### Jour 16-18: Recherche
- [ ] Barre de recherche
- [ ] Page /search avec query params
- [ ] Filtres (catégorie, auteur, note)

### Jour 19: Tests
- [x] Vitest configuré
- [ ] 5+ tests écrits
- [x] Tests passent localement

### Jour 20: CI/CD & Deploy
- [ ] GitHub Actions workflow
- [ ] Tests en CI
- [x] Déploiement Vercel existant

---

## 📊 Checkpoint & Notes

**État technique actuel**:
- [x] `npm test -- --run` passe: 1 fichier, 2 tests
- [x] `npm run build` passe
- [ ] `npm run lint` échoue: 4 erreurs `react/no-unescaped-entities` dans les pages auth

**Blocages actuels**:
- Corriger le lint des pages `/signin` et `/signup`
- Démarrer le module de soumission de manuscrits

**Notes personnelles**:
- Mémoriser le WHY derrière chaque décision
- Focus sur la compréhension, pas sur la finition
- Le fichier de statut était en retard: les pages/actions auth existent déjà

---

## 🎓 Compétences à maîtriser

- [x] Créer un système d'auth avec Better Auth
- [x] Utiliser Drizzle ORM et migrations
- [x] Valider côté serveur avec Zod
- [ ] Créer des routes dynamiques
- [x] Écrire des tests automatisés
- [ ] Configurer CI/CD avec GitHub Actions
- [ ] Gérer les erreurs de manière centralisée

---

**Mise à jour**: Compléter ce fichier au fur et à mesure. Chaque jour, mettre à jour avec ✅ et ⏳
