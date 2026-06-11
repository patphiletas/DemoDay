# Déploiement — Vercel + CI

## URL de production

`https://demo-day-wine.vercel.app`

---

## Variables d'environnement requises

À configurer dans **Vercel → Project Settings → Environment Variables** :

| Variable | Usage | Obligatoire |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL (Neon) | ✅ |
| `BETTER_AUTH_SECRET` | Signature des sessions (chaîne aléatoire ≥ 32 chars) | ✅ |
| `BETTER_AUTH_URL` | URL publique du projet (ex: `https://demo-day-wine.vercel.app`) | ✅ |
| `NEXT_PUBLIC_APP_URL` | Même URL, exposée côté client (pour les emails et liens) | ✅ |
| `RESEND_API_KEY` | Clé API Resend pour les emails transactionnels | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Nom du cloud Cloudinary | ✅ |
| `CLOUDINARY_API_KEY` | Clé API Cloudinary | ✅ |
| `CLOUDINARY_API_SECRET` | Secret API Cloudinary | ✅ |
| `OPENAI_API_KEY` | Non utilisé actuellement | ❌ |
| `OPENAI_MODEL` | Non utilisé actuellement | ❌ |

> **Format :** pas d'espace après `=`, pas de guillemets. Next.js ignore silencieusement les lignes malformées dans `.env.local`.

---

## Déploiement automatique

Vercel déploie automatiquement à chaque `git push` sur `main`. Pas de configuration supplémentaire nécessaire.

**Branches :**
- `main` → déploiement en production
- Autres branches → déploiement en preview (URL temporaire)

---

## CI — GitHub Actions

**Fichier :** `.github/workflows/learn-github-actions.yml`

```yaml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --run
```

La version Node est épinglée dans `.nvmrc` (racine du projet). Pour monter de version : mettre à jour `.nvmrc`, faire `nvm use`, `npm install`, commiter `.nvmrc` et `package-lock.json` ensemble.

> ⚠️ Toujours lancer `npm ci --dry-run` avant de commiter pour vérifier que `package-lock.json` est en sync avec `package.json`.

À chaque push sur n'importe quelle branche :
1. Checkout du code
2. Installation des dépendances (`npm ci` — utilise `package-lock.json`)
3. Lancement des tests Vitest en mode one-shot (`--run`)

> ⚠️ Le CI ne vérifie que les tests Vitest. Il ne lance pas `tsc --noEmit` ni `npm run build` — une erreur TypeScript ne bloque pas le merge.

---

## Configuration Next.js

**Fichier :** `next.config.ts`

```ts
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",   // limite du body des Server Actions (défaut : 1mb)
    },
  },
};
```

- **Turbopack** activé pour le serveur de développement (`npm run dev`)
- **`bodySizeLimit: "10mb"`** : nécessaire pour les Server Actions qui reçoivent des images (formulaire de soumission avec couverture, formulaire admin). La limite par défaut de 1 Mo serait trop restrictive.

---

## Migrations en production

Les migrations ne sont pas appliquées automatiquement au déploiement. Il faut les appliquer manuellement depuis la machine locale avec la `DATABASE_URL` de production :

```bash
# Configurer la variable d'env de production localement
DATABASE_URL="postgresql://..." npx drizzle-kit migrate
```

Ou via le dashboard Neon en collant le SQL généré dans `src/db/migrations/`.

**Migrations existantes :**
| Fichier | Contenu |
|---|---|
| `0000_*.sql` | Création initiale de toutes les tables |
| `0001_*.sql` | ... |
| `0002_*.sql` | Ajout colonne `pitch` sur `manuscripts` |
| `0003_*.sql` | Ajout colonne `publication_id` (FK) sur `manuscripts` |

---

## Commandes locales

```bash
npm run dev          # Serveur de développement (Turbopack)
npm run build        # Build de production (vérification TypeScript incluse)
npm test -- --run    # Tests Vitest one-shot
npx drizzle-kit generate   # Générer une migration après modif schema.ts
npx drizzle-kit migrate    # Appliquer les migrations
npx drizzle-kit studio     # UI d'exploration de la base
```

---

## Points d'attention post-déploiement

| Sujet | Action |
|---|---|
| Nouvelle migration | Appliquer manuellement avec `drizzle-kit migrate` avant ou après le déploiement |
| `BETTER_AUTH_SECRET` modifié | Invalide toutes les sessions en cours (déconnecte tous les utilisateurs) |
| `BETTER_AUTH_URL` incorrect | Les cookies de session ne sont pas posés sur le bon domaine → impossible de se connecter |
| Domaine Resend non vérifié | Les emails ne partent qu'à l'adresse vérifiée du compte Resend (mode sandbox) |
| Rate limiting in-memory | En cas de scale-out (plusieurs instances Vercel), le rate limit n'est pas partagé |
