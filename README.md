# 📚 Projet Alternative

## Maison d'Édition Fictive

> Une plateforme complète de **soumission, publication et modération de manuscrits** avec authentification, commentaires, notation et notifications par email.

https://demo-day-wine.vercel.app/


### 🎓 Objectifs pédagogiques

| # | Concept | Stack |
|---|---------|-------|
| 1️⃣ | Routes dynamiques | `/publications/[slug]` |
| 2️⃣ | BDD + migrations | Drizzle ORM + PostgreSQL |
| 3️⃣ | Auth + protections | Better Auth + sessions HTTP-only |
| 4️⃣ | Validation serveur | Zod schemas |
| 5️⃣ | Tests unitaires | Vitest (min 5 tests) |
| 6️⃣ | CI/CD | GitHub Actions + Vercel |
| 7️⃣ | Gestion erreurs | Custom error classes, UX-friendly |

---

## 🏗️ Fonctionnalités principales

### 1. Authentification (Jour 3-5)
- **Signup**: Créer un compte avec email, username, password
- **Signin**: Se connecter et rester authentifié via cookies HTTP-only
- **Signout**: Déconnexion sécurisée
- **Session persistance**: Rester connecté après refresh

### 2. Soumission de manuscrits (Jour 6-8)
- **Users connectés** peuvent soumettre un manuscrit
- Formulaire: Titre, contenu (markdown), catégorie
- Stockage en BDD avec status: `submitted`
- Page "Mes soumissions": voir l'état de chaque manuscrit

### 3. Système d'acceptation/rejet (Jour 9-10)
- **Admin dashboard**: lister tous les manuscrits en attente
- Voir le détail complet d'un manuscrit
- Boutons: **Accepter** → crée une publication | **Rejeter** → raison sauvegardée
- 📧 **Email à l'auteur**: "Bravo, accepté!" ou "Malheureusement, rejeté. Raison: ..."
- [BONUS] **Génération IA**: Catégorie & pitch auto-générés via OpenAI/Claude

### 4. Publications publiques (Jour 11-13)
- **Page d'accueil**: liste de toutes les publications publiées
- **Page de détail** (route dynamique `/publications/[slug]`): 
  - Contenu complet du livre
  - Auteur, date, catégorie
  - **Commentaires** (visibles par défaut, modérés post-publication)
  - **Système de notation** 1-5 étoiles
  - Note moyenne + nombre d'avis

### 5. Modération post-publication (Jour 13 suite)
- **Lecteurs** peuvent **signaler un commentaire** (raison + message optionnel)
- **Dashboard admin**: voir tous les commentaires signalés
- Admin décide: **Bannir le commentaire** (masquer) ou **Approuver** (rejeter le report)
- Approche: **post-publication moderation**, pas pré-modération
  - Les commentaires sont **visibles immédiatement**
  - Si signalés + jugés problématiques → bannissement

### 6. Notifications (Jour 13)
- 📧 **Emails via Resend**:
  - Acceptation manuscrit → email à l'auteur
  - Rejet manuscrit → email à l'auteur avec raison
- 🔔 [BONUS] **Notifications in-app**: cloche dans la navbar, marquer comme lues

### 7. Recherche & filtres (Jour 16-18)
- **Barre de recherche**: par titre/contenu
- **Filtres**: 
  - Catégorie (dropdown)
  - Auteur (dropdown)
  - Note minimum (slider)
- Page `/search?q=...&category=...&author=...&minRating=...`

### 8. Gestion d'erreurs (Jour 14-15)
- **Erreurs custom**: `ValidationError`, `NotFoundError`, `UnauthorizedError`
- **Nunca** exposer les stack traces internes
- **Pattern** `{success, error, data}` pour toutes les Server Actions
- **UX**: messages clairs, actionnables

---


