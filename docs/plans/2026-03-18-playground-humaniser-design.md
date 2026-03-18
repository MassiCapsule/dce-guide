# Design — Bouton "Humaniser" dans le Playground

## Résumé

Ajouter une fonctionnalité d'humanisation dans le Playground : après avoir généré une fiche produit V1, l'utilisateur peut charger un prompt d'humanisation (éditable), puis lancer une seconde génération pour obtenir une V2 "humanisée".

## Playground — 3 nouvelles sections

### 1. Résultat V1 (existant, renommé)
- Titre "Résultat" → "Résultat V1"
- Ajout d'un bouton "Humaniser" dans le header (à côté des tokens)
- Ce bouton charge le prompt d'humanisation avec les placeholders résolus

### 2. Prompt Humaniser (nouveau)
- Affiché après clic sur "Humaniser"
- Le prompt est chargé depuis AppConfig (`prompt_humaniser`), sinon le prompt par défaut (hardcodé depuis le fichier txt)
- Placeholders résolus : `{media.toneDescription}`, `{media.writingStyle}` depuis le média sélectionné
- `{{fiche_produit_v1}}` remplacé par le HTML V1 généré
- Mode édition libre (textarea) pour modifier le prompt avant envoi
- Bouton "Lancer" pour envoyer au modèle IA

### 3. Résultat V2 (nouveau)
- Même format que V1 : Preview / Code source + infos tokens
- Affiché après génération

## Route API

### `POST /api/playground/humanize`
- Reçoit `{ htmlV1, mediaId, model }`
- Lit `prompt_humaniser` depuis AppConfig, sinon utilise le prompt par défaut
- Résout `{media.toneDescription}` et `{media.writingStyle}` depuis le média
- Remplace `{{fiche_produit_v1}}` par `htmlV1`
- Retourne `{ prompt, html, promptTokens, completionTokens }`
- Retourne le prompt résolu (pour affichage) ET le résultat de la génération

Alternative : séparer en 2 appels (build-prompt puis generate). On choisit 2 appels pour permettre l'édition du prompt avant envoi :
1. `POST /api/playground/build-humanize-prompt` → retourne `{ prompt }` (prompt résolu, éditable)
2. `POST /api/playground/generate` (existant) → envoie le prompt édité, retourne le HTML

## Paramètres — nouveau sous-onglet

- Sous-onglet "Humaniser" dans l'onglet Prompts de `/parametres`
- Clé AppConfig : `prompt_humaniser`
- Contenu par défaut : le prompt du fichier `data/prompt humaniser.txt`
- Pas de sélecteur de modèle séparé (utilise le même modèle que la V1)

## Route API pour le prompt par défaut

- `GET /api/config/prompts` retourne aussi `humaniser` avec le prompt par défaut

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/app/playground/page.tsx` | Bouton Humaniser, section Prompt Humaniser, section Résultat V2 |
| `src/app/api/playground/build-humanize-prompt/route.ts` | Nouvelle route — résout le prompt humaniser |
| `src/app/api/config/prompts/route.ts` | Ajouter prompt par défaut `humaniser` |
| `src/app/parametres/page.tsx` | Sous-onglet "Humaniser" dans Prompts |
