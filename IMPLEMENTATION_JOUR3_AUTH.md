# 🔐 Implémentation Jour 3-5 : Authentification avec Better Auth

## 📋 Résumé des étapes

J'ai mis en place l'infrastructure complète d'authentification pour le projet Alternative. Voici ce qui a été créé :

---

## 1️⃣ Configuration Better Auth (`src/lib/auth.ts`)

### Qu'est-ce que c'est ?
C'est le cœur de l'authentification. Ce fichier configure Better Auth pour utiliser :
- **Drizzle ORM** comme adaptateur de base de données
- **PostgreSQL** (via Neon) pour le stockage des utilisateurs et sessions
- **Email + Password** comme méthode de connexion
- **HTTP-only cookies** pour les sessions sécurisées

### Code créé :
```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  appName: "Maison d'Édition Alternative",
  basePath: "/api/auth",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: ["http://localhost:3000", "https://demo-day-wine.vercel.app"],
});

export type Session = typeof auth.$Inferred.Session;
export type User = typeof auth.$Inferred.User;
```

### Pourquoi ?
- **Drizzle Adapter** : Connecte Better Auth directement à la base de données, il gère automatiquement les tables `users`, `sessions`, `accounts`, etc.
- **HTTP-only cookies** : Protège contre les attaques XSS (le JavaScript ne peut pas accéder aux cookies)
- **Types exportés** : `Session` et `User` permettent un typage fort dans le reste de l'application
- **trustedOrigins** : Évite les requêtes cross-origin malveillantes

---

## 2️⃣ Route API Better Auth (`src/app/api/auth/[...auth]/route.ts`)

### Qu'est-ce que c'est ?
C'est l'endpoint API qui gère toutes les requêtes d'authentification (signup, signin, signout, refresh, etc.).

### Code créé :
```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
```

### Pourquoi ?
- **toNextJsHandler** : Convertit l'instance Better Auth en handlers Next.js compatibles avec l'App Router
- **[...auth]** : Utilise le catch-all routing pour capturer toutes les routes `/api/auth/*` (signup, signin, signout, etc.)
- Les requêtes POST/GET à `/api/auth/*` sont automatiquement traitées par Better Auth

### Flux :
- `POST /api/auth/sign-up` → Crée un nouvel utilisateur
- `POST /api/auth/sign-in` → Vérifie les credentials et crée une session
- `GET /api/auth/session` → Retourne la session actuelle
- `POST /api/auth/sign-out` → Supprime la session

---

## 3️⃣ Client Auth Hook (`src/lib/auth-client.ts`)

### Qu'est-ce que c'est ?
C'est le pont entre le client React et l'API d'authentification. Il expose des hooks et fonctions pour gérer l'auth côté client.

### Code créé :
```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const { useSession, signOut, signIn, signUp } = authClient;
```

### Pourquoi ?
- **createAuthClient** : Crée une instance cliente de Better Auth
- **useSession** : Hook React pour accéder à la session actuelle (user, session) dans n'importe quel composant client
- **signIn, signUp, signOut** : Fonctions pour effectuer les actions d'authentification

### Exemple d'utilisation :
```typescript
const { data: session } = useSession();
if (session) {
  // L'utilisateur est connecté
  console.log(session.user.email);
}
```

---

## 4️⃣ Page Signup (`src/app/(auth)/signup/page.tsx`)

### Qu'est-ce que c'est ?
C'est la page d'inscription accessible à `/signup`. Elle affiche un formulaire où les nouveaux utilisateurs peuvent créer un compte.

### Fonctionnalités :
✅ Champs : email, nom d'utilisateur, mot de passe, confirmation du mot de passe
✅ Validation client avec Zod (avant d'envoyer au serveur)
✅ Gestion des erreurs avec affichage détaillé
✅ États de chargement (bouton désactivé pendant la requête)
✅ Redirection vers l'accueil après inscription réussie
✅ Lien vers la page de connexion pour les utilisateurs existants

### Flux :
1. L'utilisateur remplit le formulaire
2. Les validations Zod locales vérifient le format
3. Si OK, la requête `signUp.email()` est envoyée à `/api/auth/sign-up`
4. Better Auth valide à nouveau côté serveur (JAMAIS faire confiance au client)
5. Si OK : utilisateur créé, session établie, redirection vers `/`
6. Si erreur : affichage du message d'erreur

### Style :
- Tailwind CSS avec design épuré
- Centré sur la page avec max-width de 448px
- Responsive sur mobile/tablet/desktop
- Couleurs cohérentes avec le thème de l'app

---

## 5️⃣ Page Signin (`src/app/(auth)/signin/page.tsx`)

### Qu'est-ce que c'est ?
C'est la page de connexion accessible à `/signin`. Les utilisateurs existants entrent leur email et mot de passe.

### Fonctionnalités :
✅ Champs : email, mot de passe
✅ Même système de validation que signup
✅ Gestion des erreurs (email/password incorrect)
✅ États de chargement
✅ Redirection après connexion réussie
✅ Lien vers la page d'inscription pour les nouveaux utilisateurs

### Différence avec Signup :
- Moins de champs (pas de username, pas de confirmation)
- Message d'erreur spécifique : "Email ou mot de passe incorrect"
- Plus rapide et simple

---

## 6️⃣ Mise à jour `.env.local`

### Qu'est-ce que c'est ?
Les variables d'environnement nécessaires pour le fonctionnement de l'authentification.

### Modifications :
```bash
# Avant :
BETTER_AUTH_API_KEY='ba_vjpoq4kewd7lq3atxid7ch6mfa6bogan'
BETTER_AUTH_URL="http://localhost:3000"

# Après :
BETTER_AUTH_SECRET='your_secret_key_here_minimum_32_chars_long_1234567890'
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Pourquoi ?
- **BETTER_AUTH_SECRET** : Clé secrète pour chiffrer les sessions (MUST BE 32+ chars en production)
- **BETTER_AUTH_URL** : URL de base pour les redirects après auth
- **NEXT_PUBLIC_APP_URL** : URL publique pour le client (accessible au navigateur)

⚠️ **À faire** : Générer une vraie clé secrète en production !
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🏗️ Architecture globale

```
┌─────────────────────┐
│  Pages Signup/Signin │  User interact with forms
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ auth-client.ts      │  useSession, signIn, signUp hooks
│ (Better Auth React) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ /api/auth/[...auth] │  Route handler (POST/GET)
│ route.ts            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ auth.ts             │  Better Auth config
│ (Better Auth Core)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ PostgreSQL (Neon)   │  user, session, account tables
│ via Drizzle ORM     │
└─────────────────────┘
```

---

## 🔒 Sécurité mise en place

### 1. **Password Hashing**
Better Auth utilise **argon2** par défaut pour hasher les passwords. Les passwords en clair ne sont JAMAIS stockés.

### 2. **HTTP-only Cookies**
Les sessions sont stockées en cookies HTTP-only, inaccessibles au JavaScript. Protège contre XSS.

### 3. **CSRF Protection**
Better Auth génère et vérifie automatiquement les tokens CSRF.

### 4. **Validation côté serveur**
Même si le client valide avec Zod, Better Auth re-valide tout côté serveur. **Never trust the client.**

### 5. **Session Expiration**
Les sessions ont une durée de vie limitée (par défaut 30 jours). Configurable.

### 6. **Trusted Origins**
Seules les origins listées (`http://localhost:3000`, `https://demo-day-wine.vercel.app`) peuvent faire des requêtes auth.

---

## 📊 Données en base de données

Après la première inscription, Better Auth crée automatiquement ces tables :

### `users`
```sql
id | email | name | emailVerified | image | createdAt | updatedAt
```

### `sessions`
```sql
id | userId | token | expiresAt | createdAt | updatedAt
```

### `accounts` (pour OAuth, pas utilisé ici)
```sql
id | userId | accountId | provider | providerId | accessToken | ...
```

---

## ✅ Ce qui est prêt

1. ✅ Infrastructure d'authentification complète
2. ✅ Pages signup/signin avec formulaires
3. ✅ Validation Zod intégrée
4. ✅ Gestion des erreurs
5. ✅ Sessions HTTP-only sécurisées
6. ✅ Hooks React pour accéder à la session

## ❌ Prochaines étapes (Jour 6+)

1. **Navbar avec user state** : Afficher le nom de l'utilisateur, bouton logout
2. **Pages protégées** : Redirection si pas connecté
3. **Manuscriits submission** : Page pour soumettre un manuscrit
4. **Admin dashboard** : Voir les manuscrits à accepter/rejeter
5. **... et tout le reste du projet**

---

## 🧪 Test rapide

### 1. Démarrer l'app :
```bash
npm run dev
```

### 2. Aller à `http://localhost:3000/signup`
### 3. Créer un compte :
- Email: `test@example.com`
- Username: `testuser`
- Password: `password123`

### 4. Être redirigé vers `/` et connecté
### 5. Aller à `/signin` et se reconnecter
### 6. Vérifier dans DevTools → Application → Cookies : le cookie `better-auth.session_token` HTTP-only

---

## 📚 Concepts clés résumés

| Concept | Signification |
|---------|--------------|
| **Better Auth** | Framework d'authentification sécurisé pour Next.js |
| **Drizzle Adapter** | Connecte Better Auth à la base de données |
| **HTTP-only Cookie** | Cookie inaccessible au JS, protège contre XSS |
| **Zod Schema** | Validation TypeScript stricte des inputs |
| **useSession Hook** | Hook React pour accéder à la session client |
| **CSRF Token** | Token pour protéger contre les attaques cross-site |
| **Argon2** | Algorithme de hachage de password ultra-sécurisé |

---

## 🎯 Objectif pédagogique atteint

✅ **Auth + protections** : Vous avez appris :
- Comment configurer un système d'authentification professionnel
- L'importance des sessions HTTP-only
- La validation côté client ET serveur
- La gestion des erreurs UX-friendly
- L'utilisation des hooks React avec des APIs externes
