# Design — Playground mode Plan

## Contexte

Le Playground actuel permet de tester le prompt de génération de fiche produit. On ajoute un second mode "Plan" pour tester le prompt de génération du plan d'article, avec les mêmes principes (badges annotés, lecture seule, génération IA).

## Structure de la page

- Header : "Playground" (titre générique, sans mention du mode)
- TabsList en haut avec 2 onglets : **Fiche produit** | **Plan**
- Chaque onglet a ses propres states, paramètres, prompt et résultat

## Onglet "Fiche produit"

Inchangé. Le code actuel est déplacé dans cet onglet sans modification fonctionnelle.

## Onglet "Plan"

### Carte Paramètres

Champs sur une ligne :
- **ID Guide** — Input texte (l'utilisateur colle l'ID du guide)
- **Modèle IA** — Select (pré-rempli avec `media.modelPlan` ou config globale `model_plan`)

Info affichée après chargement :
- Nom du média (lecture seule, récupéré depuis le guide)

Bouton : **"Charger le prompt"**

### Comportement au clic "Charger le prompt"

1. Appel `POST /api/playground/build-plan-prompt` avec `{ guideId }`
2. L'API charge le guide complet (produits, mots-clés, critères, média)
3. Récupère le prompt plan : `media.promptPlan` ou `DEFAULT_PLAN_PROMPT`
4. Remplace les placeholders `#NomMedia`, `#MotClePrincipal`, `#NombreMots`, `#Criteres`, `#ResumeProduits`, `#MotsCles`
5. Retourne `{ segments, fullPrompt, mediaName, modelPlan }`
6. Le modèle IA est pré-sélectionné selon `modelPlan` retourné

### Carte Prompt (après chargement)

- Prompt annoté avec badges violets (même rendu que Fiche produit)
- Lecture seule
- Lien : "Pour modifier le template, rendez-vous dans Médias → [nom du média]"
- Bouton **"Générer"** en haut à droite

### Carte Résultat (après génération)

- Onglets Preview / Code source (même composant que Fiche produit)
- Tokens affichés (prompt + completion)
- Pas de bouton "Humaniser"

## API Backend

### `POST /api/playground/build-plan-prompt`

**Body :** `{ guideId: string }`

**Logique :**
1. Charge le guide avec `products.intelligence`, `keywords`, `media`
2. Construit `resumeProduits` (même logique que `plan-generator.ts` lignes 138-147)
3. Construit `motsCles` (top 30, même logique)
4. Calcule `avgWordCount`
5. Résout le prompt template (`media.promptPlan` ou `DEFAULT_PLAN_PROMPT`)
6. Produit les segments annotés (type static/variable avec nom du placeholder)
7. Produit le `fullPrompt` (texte brut avec placeholders remplacés)

**Retour :** `{ segments, fullPrompt, mediaName, modelPlan }`

### Génération

Réutilise `POST /api/playground/generate` existant (prompt + model → HTML).

## Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `src/app/playground/page.tsx` | Refactor : wrapper TabsList + onglet Fiche produit (code existant) + onglet Plan (nouveau) |
| `src/app/api/playground/build-plan-prompt/route.ts` | Nouvelle route API |
| `src/lib/prompt-builder/plan-annotated.ts` | Builder de prompt plan annoté (segments + badges) |
