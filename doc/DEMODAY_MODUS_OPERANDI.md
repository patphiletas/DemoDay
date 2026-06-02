# Modus operandi — Démo Day AlterNative

> Durée cible : 6 min de démo + 5 min Q&A
> Préparer avant : app lancée (`npm run dev`), navigateur ouvert, onglets prêts, slides affichées

---

## Avant de commencer — Préparer les onglets

| Onglet | URL | Compte |
|---|---|---|
| App — accueil | `localhost:3000` | — |
| App — soumission | `localhost:3000/manuscripts/submit` | compte auteur |
| App — admin | `localhost:3000/admin` | compte admin |
| Éditeur — epub.ts | VSCode ouvert sur `src/lib/epub.ts` | — |

Avoir un fichier `.epub` de test prêt sur le bureau.

---

## [0:00 – 1:00] Slide 1 + 2 — Introduction

**Slide 1 — Titre**
> "Je vous présente AlterNative, une revue littéraire collaborative."

**Slide 2 — Contexte**
> "C'est une plateforme où des auteurs peuvent soumettre des manuscrits au format EPUB.
> Les admins les lisent, les acceptent ou les refusent, et les publications deviennent lisibles par tout le monde.
> Il y a 3 rôles : visiteur, auteur, admin."

**Slide 3 — Stack**
> "Côté technique : Next.js 15 App Router avec TypeScript, PostgreSQL via Drizzle ORM, Better Auth pour l'authentification, Cloudinary pour les images, et Resend pour les emails."

---

## [1:00 – 1:30] Basculer sur le navigateur — accueil

→ Afficher `localhost:3000`

> "Voilà l'accueil. Les publications acceptées apparaissent ici sous forme de cartes."

---

## [1:30 – 3:00] Slide 4 — Parcours auteur

→ Aller sur l'onglet soumission (connecté en tant qu'auteur)

> "Je suis connecté en tant qu'auteur. Je vais soumettre un manuscrit."

**Actions à faire en live :**
1. Uploader le fichier `.epub`
2. Montrer le spinner "Extraction en cours…"
3. Montrer les champs pré-remplis : titre, auteur, contenu, aperçu de la couverture
4. Pointer les champs

> "Dès que je charge l'EPUB, l'app extrait automatiquement le titre, le nom d'auteur, le contenu structuré en chapitres, et la couverture. L'auteur peut corriger avant de soumettre."

5. Soumettre le formulaire

> "Le manuscrit est soumis, il passe en attente de validation."

---

## [3:00 – 4:00] Slide 5 — Parcours admin

→ Basculer sur l'onglet admin (connecté en tant qu'admin)

> "Côté admin, voici le dashboard. On voit les manuscrits en attente."

**Actions à faire en live :**
1. Montrer la liste des manuscrits en attente
2. Cliquer "Accepter" sur le manuscrit soumis à l'étape précédente

> "J'accepte le manuscrit. En un clic, il devient une publication — la transaction crée l'entrée en base et les chapitres sont parsés."

3. Montrer que le manuscrit disparaît de la liste d'attente

> "Un refus envoie automatiquement un email à l'auteur via Resend."

---

## [4:00 – 4:30] Slide 6 — Parcours lecteur

→ Aller sur l'accueil ou directement sur la page de la publication

> "La publication est maintenant visible. Un lecteur peut naviguer chapitre par chapitre, laisser une note et des commentaires."

**Actions à faire en live :**
1. Ouvrir la publication
2. Naviguer entre deux chapitres
3. (Optionnel) Laisser une note

---

## [4:30 – 6:00] Slide 7 — Dans le code : EPUB

→ Basculer sur VSCode — `src/lib/epub.ts`

**Slide 7 affichée à côté si possible**

> "Je vais vous montrer la partie la plus intéressante techniquement : le parser EPUB."

**Pointer la ligne `Array.isArray` (environ ligne 50-60) :**
> "Un EPUB c'est une archive ZIP avec du HTML à l'intérieur. J'utilise la lib `epub2` pour l'ouvrir.
> Problème : cette lib n'est pas cohérente — selon les fichiers, elle retourne soit une string, soit un tuple `[contenu, mime]`.
> C'est non documenté, je l'ai découvert en testant avec de vrais EPUBs.
> La correction : un simple `Array.isArray` pour gérer les deux cas."

**Pointer `stripHtml` :**
> "Ensuite je nettoie le HTML : je supprime les balises style et script, je convertis les `<br>` et `</p>` en sauts de ligne, je décode toutes les entités HTML — y compris les hexadécimales comme `&#x27;` — et je normalise les espaces."

**Pointer l'écriture dans `/tmp/` :**
> "Autre contrainte : epub2 ne peut pas lire un Buffer en mémoire, elle a besoin d'un chemin disque. J'écris donc le fichier dans `/tmp/`, je le lis, puis je le supprime dans un `finally` — même en cas d'erreur."

---

## [6:00 – 7:00] Slide 8 — Bilan

> "Quelques mots de bilan."

**Réussites :**
> "L'auth avec rôles fonctionne, le workflow manuscrit est complet de bout en bout, et le parser EPUB gère les cas tordus."

**Difficultés :**
> "Next.js 15 a des breaking changes importants — les `params` et `searchParams` sont devenus des Promises, ce qui casse pas mal de patterns habituels. Et epub2 avait ce comportement non documenté."

**Axes d'amélioration :**
> "Il manque une UI pour les notifications et les signalements — les tables existent en base, mais pas les interfaces. Et un middleware global Next.js pour protéger les routes."

---

## [7:00] Slide 9 — Questions

> "Voilà pour AlterNative. Je suis dispo pour vos questions."

---

## Points à ne pas oublier

- Parler du **`/tmp/`** si les devs posent des questions sur epub2 (question probable)
- Mentionner que l'upload Cloudinary se fait **côté serveur** (les clés API ne sont pas exposées au client)
- Si on te demande pourquoi `ref` et pas `useState` pour le pré-remplissage : éviter le re-render du formulaire complet
- Le rate limiting sur `/api/parse-epub` est absent → **anticiper** : "c'est un démo, en prod j'ajouterais un rate limit par IP"
