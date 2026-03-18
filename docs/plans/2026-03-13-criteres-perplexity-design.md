# Design — Critères de sélection + bouton Perplexity

## Contexte

Lors de la création d'un guide d'achat, l'utilisateur doit pouvoir définir les critères de sélection des produits. Un bouton "Générer" ouvre Perplexity dans un nouvel onglet avec un prompt pré-rempli (mot clé substitué). Le prompt est éditable dans les Paramètres.

## Composants impactés

- `prisma/schema.prisma` — ajout champ `criteria` sur `Guide`
- `src/app/api/guides/route.ts` — prise en compte de `criteria` au POST
- `src/components/guides/guide-form.tsx` — nouvelle card + bouton
- `src/app/parametres/page.tsx` — nouveau tab "Critères Perplexity"

## Design détaillé

### 1. Schéma BDD

Ajout sur le modèle `Guide` :
```prisma
criteria String @default("")
```
Migration Prisma nécessaire (`npx prisma migrate dev`).

### 2. Nouvelle Card dans le formulaire

Position : entre "Informations du guide" et "Produits".

Contenu :
- Titre : "Critères de sélection des produits"
- Textarea `criteria` (facultatif, multi-lignes)
- Bouton "Générer" (ExternalLink icon) qui :
  1. Récupère le prompt depuis `/api/config` (clé `prompt_criteres`)
  2. Remplace `#MotClesprincipal` par la valeur du champ `title`
  3. Ouvre `https://www.perplexity.ai/search?q=<encodé>` dans un nouvel onglet
  4. Si `title` est vide, affiche une alerte "Renseignez d'abord le mot clé principal"

### 3. API guides

Le POST `/api/guides` accepte `criteria` (string optionnel) et le sauvegarde.

### 4. Paramètres

Dans la section "Prompts OpenAI", ajout d'un 3ème onglet "Critères Perplexity".

Prompt par défaut (clé `prompt_criteres`) :
```
Je crée un guide d'achat sur : #MotClesprincipal Merci de me donner les 5 critères essentiels pour les choisir sous forme d'une liste numéroté dans une black windows Pour chaque critère, je veux une mini-explication. Le critère et son explication sur la même ligne Je ne veux pas que tu fasses apparaître les sources
```

Sauvegardé via le même mécanisme que `prompt_generation` et `prompt_analysis`.
