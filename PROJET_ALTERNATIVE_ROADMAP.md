# 📚 Projet Alternative: Maison d'Édition Fictive

**Durée** : 4 semaines  
**Type** : Projet individuel  
**Objectif pédagogique** : Maîtriser l'authentification, la gestion de données liées aux utilisateurs, la validation, les tests, et la CI/CD.

---

## 📋 Vue d'ensemble du projet

Une plateforme où :
- Les **utilisateurs non connectés** peuvent explorer les écrits publiés
- Les **utilisateurs connectés** peuvent soumettre des manuscrits
- Un **système d'acceptation/rejet** modère les soumissions
- Les écrits publiés reçoivent **commentaires** et **notes**
- Un **interface admin** gère l'acceptation des manuscrits et la modération
- Une **recherche avancée** filtre par catégorie, auteur, note, etc.

---

## 🎯 7 Impératifs techniques à couvrir

- [ ] 1. Routes dynamiques (URL params)
- [ ] 2. Base de données + migrations
- [ ] 3. Authentification + routes protégées
- [ ] 4. Validation d'inputs côté serveur
- [ ] 5. Suite de tests
- [ ] 6. CI avec GitHub Actions
- [ ] 7. Gestion d'erreurs centralisée

---

## 🏗️ Architecture & Stack

### Stack technique
```
Frontend: React 19 + Next.js 16 + TailwindCSS 4
Backend: Next.js API Routes
ORM: Drizzle ORM
BDD: PostgreSQL (Neon)
Auth: Better Auth
Validation: Zod
Tests: Vitest
CI/CD: GitHub Actions
API IA: OpenAI ou Claude (pour catégorisation & pitch - BONUS)
```

### Structure du projet (à créer)

```
publishing-house/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── signin/
│   │   │   └── signup/
│   │   ├── (admin)/
│   │   │   ├── dashboard/
│   │   │   └── layout.tsx
│   │   ├── publications/
│   │   │   └── [slug]/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── manuscripts/
│   │   │   ├── publications/
│   │   │   └── comments/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── forms/
│   │   ├── ui/
│   │   └── layouts/
│   ├── db/
│   │   ├── schema.ts
│   │   └── migrations/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── errors.ts
│   ├── types/
│   └── tests/
├── .env.local
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 📊 Schéma de base de données

**Tables à créer (avec Drizzle):**

```
users
├── id (PK)
├── email (unique)
├── username (unique)
├── passwordHash
├── role (user | admin)
├── createdAt
└── updatedAt

manuscripts
├── id (PK)
├── title
├── content
├── category
├── authorId (FK → users)
├── status (submitted | accepted | rejected)
├── submittedAt
├── reviewedAt
└── rejectionReason (nullable)

publications
├── id (PK)
├── slug (unique)
├── title
├── content
├── category (généré par IA à l'acceptation, éditable par admin)
├── pitch (généré par IA à l'acceptation, éditable par admin)
├── authorId (FK → users)
├── publishedAt
├── updatedAt
└── isVisible (pour soft delete)

comments
├── id (PK)
├── content
├── publicationId (FK → publications)
├── authorId (FK → users)
├── createdAt
├── isModerated (false = modération en attente)
└── isDeleted (soft delete)

ratings
├── id (PK)
├── score (1-5)
├── publicationId (FK → publications)
├── userId (FK → users)
├── createdAt
└── unique(publicationId, userId) // un seul avis par user
```

---

## 🚀 Plan semaine par semaine

### **SEMAINE 1: Fondations & Auth**

#### Jour 1-2: Initialisation du projet

**Objectif** : Avoir une structure Next.js fonctionnelle avec BDD connectée.

**Étapes** :
1. Créer un nouveau projet Next.js 16
   ```bash
   npx create-next-app@latest publishing-house --typescript --tailwind
   ```

2. Installer les dépendances essentielles
   ```bash
   npm install drizzle-orm drizzle-kit pg better-auth zod vitest
   ```

3. Configurer les variables d'environnement
   - DATABASE_URL (Neon PostgreSQL)
   - BETTER_AUTH_SECRET
   - BETTER_AUTH_URL

4. Créer la première migration Drizzle
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

**Concepts clés à comprendre** :
- Qu'est-ce qu'une migration et pourquoi c'est important ?
- Comment Drizzle génère le schéma SQL à partir du TypeScript
- Les relations entre tables (Foreign Keys)

**Questions à se poser** :
- Pourquoi Better Auth plutôt que NextAuth ou une implémentation custom ?
- Quel est le flow d'authentification (signup → signin → cookie/session) ?

**Checkpoint** ✅
```
- [ ] Projet Next.js crée et fonctionne localement
- [ ] Drizzle configuré et première migration lancée
- [ ] Base de données connectée (tester avec un SELECT simple)
- [ ] Variables d'environnement configurées
```

---

#### Jour 3-5: Authentification (Auth & Signup/Signin)

**Objectif** : Utilisateurs peuvent créer un compte et se connecter.

**Étapes** :

1. **Configurer Better Auth**
   - Créer `src/lib/auth.ts`
   - Initialiser le client et serveur Better Auth
   - Définir les callbacks (après signup, avant signin, etc.)
   - Étendre le schéma utilisateur (ajouter `username`, `role`)

   **Ressource** : [Better Auth docs](http://better-auth.com/)

2. **Créer les pages d'authentification**
   - `src/app/(auth)/signup/page.tsx` → formulaire d'inscription
   - `src/app/(auth)/signin/page.tsx` → formulaire de connexion

3. **Implémenter les formulaires avec Zod**
   - Créer `src/lib/validation.ts` avec schémas Zod
   - Schéma signup : `email`, `username` (lettres/chiffres/tirets/points), `password` (8+ chars)
   - Schéma signin : `email`, `password`

4. **Server Actions pour soumettre les formulaires**
   - Créer `src/app/(auth)/actions.ts`
   - Action `signupAction` et `signinAction`
   - Validation côté serveur avec Zod
   - Gestion des erreurs (email existant, validation échouée, etc.)

5. **Navigation adaptée à l'état auth**
   - Créer un hook `useSession()` pour lire la session
   - Navbar avec :
     - Si connecté : nom d'utilisateur + bouton déconnexion
     - Si non connecté : liens signin/signup
   - Redirection automatique : si déjà connecté, ne pas afficher signin/signup

**Concepts clés à comprendre** :
- Server Actions vs API Routes (quand utiliser quoi ?)
- Cookies et sessions (comment Better Auth persiste l'utilisateur ?)
- Hashing de mot de passe (pourquoi ne jamais stocker en clair ?)
- Validation côté serveur vs client (pourquoi les deux ?)

**Questions à se poser** :
- Comment Better Auth gère les cookies ? (secure, httpOnly, etc.)
- Qu'est-ce qui empêche quelqu'un d'usurper l'identité d'un autre ?
- Pourquoi valider côté serveur même si tu as validé côté client ?

**Checkpoint** ✅
```
- [ ] Pages signup et signin fonctionnelles
- [ ] Zod schemas créés et validant correctement
- [ ] Server Actions appelant Better Auth
- [ ] Erreurs affichées clairement à l'utilisateur
- [ ] Navbar adaptée à l'état auth
- [ ] Redirection si déjà connecté
- [ ] Sessions persistant après refresh
```

---

### **SEMAINE 2: Soumission & Acceptance**

#### Jour 6-8: Soumission de manuscrits

**Objectif** : Utilisateurs connectés peuvent soumettre un manuscrit.

**Étapes** :

1. **Créer la page de soumission**
   - `src/app/submit/page.tsx`
   - Redirection si non connecté

2. **Formulaire de soumission avec Zod**
   - Champs : `title`, `content`, `category`, `description`
   - Zod schema : titre 5-200 chars, contenu 100+ chars, catégorie dans liste prédéfinie

3. **Server Action pour soumettre**
   - `src/app/submit/actions.ts` → `submitManuscriptAction`
   - Validation
   - Insérer dans table `manuscripts` avec `status: "submitted"`
   - Retour succès ou erreur

4. **Page "Mes soumissions"**
   - `src/app/my-manuscripts/page.tsx`
   - Afficher les manuscrits de l'utilisateur connecté
   - Afficher le statut (submitted, accepted, rejected)
   - Raison du rejet si rejeté

**Concepts clés à comprendre** :
- Relation utilisateur ↔ manuscrits (étranger clé, cascade delete)
- Transactions SQL (si validation échoue, rien ne s'écrit)
- Timestamp pour tracer les dates (createdAt, submittedAt)
- Appel API externe (OpenAI/Claude) et gestion des erreurs (timeout, rate limit)
- Génération une seule fois : le résultat IA devient part intégrante de la publication

**Questions à se poser** :
- Que se passe-t-il si un utilisateur essaie d'accéder aux manuscrits d'un autre ?
- Comment valider que l'utilisateur a bien le droit de voir/modifier un manuscrit ?

**Checkpoint** ✅
```
- [ ] Page de soumission accessible seulement aux connectés
- [ ] Formulaire avec validation Zod
- [ ] Manuscrits insérés en BDD
- [ ] Page "Mes soumissions" affiche les manuscrits de l'user
- [ ] Les données sensibles ne fuient pas (ex: un user ne voit pas les autres manuscrits)
```

---

#### Jour 9-10: Acceptance & Admin Dashboard (part 1)

**Objectif** : Admin peut accepter/rejeter les manuscrits soumis.

**Étapes** :

1. **Middleware de protection (admin)**
   - Créer `src/lib/auth-middleware.ts`
   - Vérifier le rôle avant d'accéder aux routes admin
   - Rediriger vers accueil si non admin

2. **Page admin : dashboard**
   - `src/app/(admin)/dashboard/page.tsx`
   - Lister tous les manuscrits en attente (status = "submitted")
   - Afficher : titre, auteur, date, aperçu

3. **Détail d'un manuscrit (pour review)**
   - `src/app/(admin)/manuscripts/[id]/page.tsx` (route dynamique!)
   - Afficher tout le contenu
   - Boutons : "Accepter" | "Rejeter"
   - Si rejeter : textarea pour expliquer pourquoi

4. **Server Actions pour accept/reject**
   - `acceptManuscriptAction(manuscriptId)`
   - `rejectManuscriptAction(manuscriptId, reason)`
   - Mettre à jour le statut dans la BDD
   - Si accepté : créer une `publication` correspondante

5. **[BONUS] Génération IA de catégorie & pitch**
   - Lors de l'acceptation, appeler OpenAI/Claude
   - Requête : "Lis ce manuscrit et propose : 1) catégorie (fiction, poésie, etc.) 2) pitch accrocheur 2-3 lignes"
   - Stocker `category` et `pitch` dans la table `publications`
   - Admin peut éditer manuellement si besoin
   
   Exemple Server Action :
   ```typescript
   export async function acceptManuscriptAction(manuscriptId: number) {
     const manuscript = await getManuscript(manuscriptId);
     
     // Appel IA (une seule fois)
     const aiResult = await generateCategoryAndPitch(manuscript.content);
     
     // Créer la publication avec les résultats IA
     const publication = await db.insert(publications).values({
       title: manuscript.title,
       content: manuscript.content,
       authorId: manuscript.authorId,
       category: aiResult.category,
       pitch: aiResult.pitch,
       slug: generateSlug(manuscript.title),
       publishedAt: new Date(),
     }).returning();
     
     // Mettre à jour le manuscrit
     await db.update(manuscripts)
       .set({ status: "accepted" })
       .where(eq(manuscripts.id, manuscriptId));
     
     return publication;
   }
   ```

**Concepts clés à comprendre** :
- Routes protégées (middleware vs vérification manuelle)
- Routes dynamiques en Next.js (`[id]` paramètres URL)
- Transactions : si on accepte un manuscrit, on crée une publication atomiquement
- Audit trail (tracer qui a accepté/rejeté et quand)

**Questions à se poser** :
- Qu'est-ce qui empêche un user non-admin d'accéder au dashboard ?
- Si deux admins acceptent le même manuscrit en même temps, que se passe-t-il ?
- Pourquoi créer une "publication" à partir d'un manuscrit accepté au lieu de juste changer son statut ?

**Checkpoint** ✅
```
- [ ] Route admin protégée (redirection si non-admin)
- [ ] Dashboard affiche les manuscrits en attente
- [ ] Route dynamique [id] pour voir détail d'un manuscrit
- [ ] Acceptation crée une publication
- [ ] Rejet sauvegarde la raison
- [ ] Seul un admin peut faire ça
```

---

### **SEMAINE 3: Publications, Commentaires & Erreurs**

#### Jour 11-13: Afficher les publications et Commentaires

**Objectif** : Écrits publiés sont visibles, avec commentaires et notes.

**Étapes** :

1. **Page d'accueil : liste des publications**
   - `src/app/page.tsx`
   - Afficher toutes les publications (où `isVisible = true`)
   - Pour chaque : titre, auteur, catégorie, note moyenne, nombre de commentaires
   - Lien vers la publication

2. **Page de détail d'une publication (route dynamique)**
   - `src/app/publications/[slug]/page.tsx`
   - Afficher : titre, contenu, auteur, date, catégorie
   - Afficher les commentaires
   - Section pour noter (1-5 étoiles) - seulement si connecté
   - Section pour commenter - seulement si connecté

3. **Formulaire de commentaire**
   - Zod schema : contenu 1-500 chars
   - Server Action : `addCommentAction`
   - Insérer dans table `comments` avec `authorId` et `publicationId`
   - Les commentaires sont en attente de modération (`isModerated: false`)

4. **Système de notation**
   - Formulaire simple : 5 boutons (1-5 étoiles)
   - Server Action : `ratePublicationAction`
   - Unique(publicationId, userId) : un seul avis par user
   - Afficher la note moyenne et le nombre d'avis

**Concepts clés à comprendre** :
- Slugs (URL friendly) : pourquoi pas `/publications/1` mais `/publications/mon-titre` ?
- Relations N:M (un publication ↔ plusieurs commentaires/ratings)
- Agrégation SQL : comment calculer la note moyenne ?
- Modération : pourquoi les commentaires commencent en attente ?

**Questions à se poser** :
- Que se passe-t-il si je supprime un utilisateur ? Ses commentaires ?
- Comment afficher les commentaires modérés et non-modérés différemment ?
- Pourquoi empêcher plusieurs avis du même user sur la même publication ?

**Checkpoint** ✅
```
- [ ] Page d'accueil liste les publications
- [ ] Route dynamique [slug] fonctionne
- [ ] Commentaires visibles (modérés seulement)
- [ ] Formulaire de commentaire (connecté seulement)
- [ ] Système de notation (1-5 étoiles)
- [ ] Note moyenne calculée et affichée
```

---

#### Jour 13 (suite): Signalement de commentaires & Notifications

**Objectif** : Lecteurs peuvent signaler des commentaires, admin modère post-hoc, auteurs reçoivent des emails.

**Étapes** :

1. **Système de signalement**
   - Bouton "Signaler" sous chaque commentaire (connecté seulement)
   - Formulaire : sélectionner une raison + optionnel message
   - Insérer dans table `reports`

2. **Dashboard admin : commentaires signalés**
   - Page `src/app/(admin)/reports/page.tsx`
   - Lister les reports (non-traités)
   - Boutons : "Bannir ce commentaire" | "Approuver (rejeter le report)"
   - Si bannir : marquer `comments.isModerated = false`

3. **Emails avec Resend**
   - À l'acceptation du manuscrit : email "Bravo, votre manuscrit X a été accepté !"
   - Au rejet : email "Malheureusement, X a été rejeté. Raison : Y"
   - Server Action `acceptManuscriptAction` et `rejectManuscriptAction` envoient les emails

   ```typescript
   import { Resend } from "resend";
   const resend = new Resend(process.env.RESEND_API_KEY);
   
   // À l'acceptation
   await resend.emails.send({
     from: "noreply@maison-edition.com",
     to: author.email,
     subject: "Votre manuscrit a été accepté ! 🎉",
     html: `<p>Bravo ! "${manuscript.title}" a été accepté...</p>`
   });
   ```

4. **Notifications in-app (bonus)**
   - Créer aussi une notification dans table `notifications`
   - Afficher une cloche 🔔 dans la navbar si non-lues

**Concepts clés à comprendre** :
- Signalement post-publication vs modération pré-publication
- Workflow asynchrone : acceptation → email + notification
- Intégration d'un service externe (Resend)
- Gestion d'erreurs : si l'email échoue, que se passe-t-il ?

---

#### Jour 14-15: Gestion d'erreurs centralisée

**Objectif** : Erreurs gérées proprement, jamais d'erreur brute à l'utilisateur.

**Étapes** :

1. **Créer un système d'erreurs centralisé**
   - `src/lib/errors.ts`
   - Définir des classes d'erreurs custom
   - Ex: `NotFoundError`, `UnauthorizedError`, `ValidationError`

2. **Page d'erreur globale**
   - `src/app/error.tsx`
   - Catch les erreurs non gérées
   - Affiche un message user-friendly

3. **Gestion d'erreurs dans les Server Actions**
   - Try/catch autour de chaque action
   - Retourner un objet : `{ success: boolean, error?: string, data?: ... }`
   - Exemple :
     ```typescript
     try {
       // logique
       return { success: true, data: ... }
     } catch (error) {
       if (error instanceof ValidationError) {
         return { success: false, error: "Les données ne sont pas valides" }
       }
       return { success: false, error: "Une erreur serveur s'est produite" }
     }
     ```

4. **Afficher les erreurs dans l'UI**
   - Toast ou banner après soumission d'un formulaire
   - Message spécifique selon le type d'erreur

**Concepts clés à comprendre** :
- Pourquoi ne jamais exposer les erreurs internes à l'utilisateur ?
- Logging : comment tracer les erreurs sans déranger l'utilisateur ?
- Types d'erreurs : validation vs serveur vs authentification

**Questions à se poser** :
- Qu'est-ce qu'un utilisateur doit savoir après une erreur ?
- Comment différencier une erreur de validation d'une erreur serveur ?

**Checkpoint** ✅
```
- [ ] Classe d'erreurs custom créée
- [ ] Page error.tsx fonctionne
- [ ] Server Actions retournent {success, error, data}
- [ ] Erreurs affichées user-friendly
- [ ] Pas d'erreur brute exposée
```

---

### **SEMAINE 4: Recherche, Tests & Déploiement**

#### Jour 16-18: Recherche & Filtres

**Objectif** : Utilisateurs peuvent chercher et filtrer les publications.

**Étapes** :

1. **Barre de recherche simple**
   - `src/components/SearchBar.tsx`
   - Input texte + bouton search
   - Redirect vers `/search?q=...&category=...&author=...`

2. **Page de résultats**
   - `src/app/search/page.tsx`
   - Query params : `q` (recherche), `category`, `author`, `minRating`
   - Server Component qui lit les query params
   - Construire une requête SQL conditionnelle

   ```typescript
   // Pseudo-code
   let query = db.select().from(publications);
   
   if (searchTerm) {
     query = query.where(
       or(
         like(publications.title, `%${searchTerm}%`),
         like(publications.content, `%${searchTerm}%`)
       )
     );
   }
   
   if (category) {
     query = query.where(eq(publications.category, category));
   }
   
   const results = await query;
   ```

3. **Filtres**
   - Checkboxes pour catégories
   - Dropdown pour auteur
   - Slider pour note minimum
   - Chaque filtre appelle `/search?...` avec les bons params

**Concepts clés à comprendre** :
- Query params en Next.js (lire avec `searchParams`)
- Requêtes SQL conditionnelles
- Performance : fulltext search vs LIKE simple
- UX : actualisation sans recharger la page entière

**Questions à se poser** :
- Pourquoi pas une API route au lieu d'une page serveur ?
- Comment faire une recherche super rapide sur 100k publications ?

**Checkpoint** ✅
```
- [ ] Barre de recherche fonctionne
- [ ] Page /search affiche les résultats
- [ ] Filtres par catégorie, auteur, note
- [ ] Les filtres se combinent correctement
```

---

#### Jour 19: Tests

**Objectif** : Suite de tests pour les fonctionnalités critiques.

**Étapes** :

1. **Configurer Vitest**
   - `vitest.config.ts`
   - Configurer avec Next.js

2. **Écrire au minimum 5 tests**
   - Test Zod schemas (validation)
   - Test Server Action (création de manuscrit)
   - Test acceptance/rejection
   - Test recherche
   - Test permissions (non-admin ne peut pas voir le dashboard)

   Exemple :
   ```typescript
   describe("Validation", () => {
     it("devrait rejeter un email invalide", () => {
       const result = signupSchema.safeParse({
         email: "invalid",
         username: "john",
         password: "12345678"
       });
       expect(result.success).toBe(false);
     });

     it("devrait accepter une soumission valide", () => {
       const result = signupSchema.safeParse({
         email: "john@example.com",
         username: "john-doe",
         password: "12345678"
       });
       expect(result.success).toBe(true);
     });
   });
   ```

3. **Lancer les tests localement**
   ```bash
   npm run test
   ```

**Concepts clés à comprendre** :
- Pourquoi tester ?
- Tests unitaires vs tests d'intégration vs tests E2E
- Comment tester du code async (Server Actions, DB) ?

**Checkpoint** ✅
```
- [ ] Vitest configuré
- [ ] Au moins 5 tests écrits
- [ ] Tests passent localement
```

---

#### Jour 20: CI/CD & Déploiement

**Objectif** : Tests tournent automatiquement sur chaque PR, déploiement automatique.

**Étapes** :

1. **GitHub Actions CI**
   - `.github/workflows/test.yml`
   - Déclenche sur : push et PR
   - Steps : install → build → test
   - Doit passer pour merger une PR

   Exemple workflow :
   ```yaml
   name: Tests
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '18'
         - run: npm ci
         - run: npm run build
         - run: npm test
   ```

2. **Déploiement sur Vercel**
   - Connecter le repo GitHub
   - Ajouter les env vars (DATABASE_URL, BETTER_AUTH_SECRET, etc.)
   - Configuration automatique (Vercel détecte Next.js)
   - Deploy sur chaque push à `main`

3. **Tester le déploiement**
   - Vérifier que tout fonctionne en prod
   - Env vars correctes
   - BDD accessible

**Concepts clés à comprendre** :
- Pourquoi CI/CD ?
- Environnements : local, preview, production
- Variables d'environnement sensibles
- Rollback en cas de souci

**Questions à se poser** :
- Que se passe-t-il si un test échoue en CI ?
- Comment les env vars prod sont-elles sécurisées sur Vercel ?

**Checkpoint** ✅
```
- [ ] GitHub Actions workflow créé et fonctionnel
- [ ] Tests passent en CI
- [ ] Déployé sur Vercel
- [ ] Site en prod accessible et fonctionnel
- [ ] Env vars correctes en prod
```

---

## 🧪 Checklist finale (fin semaine 4)

**Core features** :
- [ ] Auth complète (signup, signin, signout)
- [ ] Soumission de manuscrits
- [ ] Acceptance/rejet par admin
- [ ] Publications visibles publiquement
- [ ] Commentaires modérés
- [ ] Système de notation
- [ ] Recherche et filtres
- [ ] Routes dynamiques
- [ ] Validation Zod partout
- [ ] Gestion d'erreurs centralisée
- [ ] Tests + CI
- [ ] Déploiement en prod

**Bonus** (si tu as du temps) :
- [ ] **Génération IA de catégorie & pitch** (à l'acceptation du manuscrit)
- [ ] Édition/suppression de commentaires par auteur
- [ ] Suppression de publication par admin
- [ ] Profil utilisateur (voir les publications de quelqu'un)
- [ ] Notifications (acceptation d'un manuscrit, réponse à un commentaire)
- [ ] Système de "favoris"

---

## 💡 Conseils pédagogiques

### Pour chaque fonctionnalité, demande-toi :

1. **Pourquoi cette approche ?**
   - Pourquoi Zod et pas juste du JS ?
   - Pourquoi une table `manuscripts` ET une table `publications` ?
   - Pourquoi valider côté serveur même si le client valide ?

2. **Sécurité : qui peut faire quoi ?**
   - Un user peut-il voir les manuscrits des autres ?
   - Un non-admin peut-il accepter un manuscrit ?
   - Comment l'empêcher techniquement (pas juste "on ne lui affiche pas") ?

3. **Données : qu'est-ce qui pourrait mal tourner ?**
   - Si deux users commentent en même temps, l'ordre est-il garanti ?
   - Si j'accepte un manuscrit mais que la création de publication échoue, l'état est-il cohérent ?

4. **UX : comment l'utilisateur comprend-il ?**
   - Qu'est-ce qu'il se passe quand il clique sur un bouton ?
   - Comment sait-il que son action a fonctionné ou échoué ?

### Ressources clés à consulter régulièrement :

- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Better Auth Docs](http://better-auth.com/)
- [Zod Docs](https://zod.dev/)
- [Vitest Docs](https://vitest.dev/)

---

## 📅 Timeline de travail suggérée

```
Semaine 1
├── Jour 1-2: Init + BDD ✅
├── Jour 3-5: Auth (signup/signin)
│
Semaine 2
├── Jour 6-8: Soumission manuscrits
├── Jour 9-10: Admin dashboard + acceptance
│
Semaine 3
├── Jour 11-13: Publications + commentaires + ratings
├── Jour 14-15: Gestion d'erreurs
│
Semaine 4
├── Jour 16-18: Recherche
├── Jour 19: Tests
├── Jour 20: CI/CD + déploiement
│
Bonus: Bonus features selon le temps restant
```

---

## 🎯 À la fin du projet

Être capable de dire/expliquer :

- "J'ai créé une système d'auth avec Better Auth parce que [POURQUOI]"
- "La table `manuscripts` est séparée de `publications` parce que [POURQUOI]"
- "Je valide côté serveur avec Zod parce que [POURQUOI]"
- "Un utilisateur non-admin ne peut pas accéder au dashboard parce que [COMMENT]"
- "Les tests tournent en CI parce que [POURQUOI]"
- "Je déploie sur Vercel parce que [POURQUOI]"

Si tu peux expliquer tout ça, tu as gagné. 🎓

---

**Next step** : On commencerait par quoi ? Initialisation du projet ou vérification de la structure existante ?
