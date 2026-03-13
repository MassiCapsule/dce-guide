# Design — Refonte éditeur de guide (4 étapes)

**Date :** 2026-03-13
**Statut :** Approuvé

---

## Contexte

Refonte complète de la page `/guides/[id]` pour structurer le workflow en 4 étapes claires, avec un éditeur WYSIWYG riche et une intégration du score SEO Serpmantics.

**Priorité immédiate :** construire l'UX/UI avec des données fictives (sans appels API réels) pour valider l'interface avant d'implémenter la logique métier.

---

## Les 4 étapes du workflow

| Étape | Nom | Déverrouillée quand |
|-------|-----|---------------------|
| 1 | Création du guide | Toujours |
| 2 | Récupération des produits | Après étape 1 |
| 3 | Plan d'article | Après étape 2 |
| 4 | Rédaction de l'article | Après validation du plan |

### Calcul du nombre de mots cible
`(min_mots + max_mots) / 2` — extrait des mots-clés Serpmantics (`structure.length.from` et `structure.length.to`).

---

## Structure de la page `/guides/[id]`

### En-tête
- Breadcrumb : `← Guides / [Titre du guide]`
- Statut global : `✅ Guide créé · ✅ Produits · ⏳ Plan · 🔒 Article`

### Onglets (Option A — horizontaux)
```
[ Vue d'ensemble ] [ Produits ] [ Plan ] [ Article ]
```
Les onglets `Plan` et `Article` sont grisés et non cliquables tant que leurs prérequis ne sont pas remplis.

---

## Onglet 1 — Vue d'ensemble

- Mot-clé principal
- Nombre de mots cible (calculé)
- Champ libre : **Critères de sélection des produits** (textarea, sauvegardé en DB)
- Résumé des étapes avec statut et date
- Boutons de navigation vers chaque onglet actif

---

## Onglet 2 — Produits

- Liste des produits avec : image, titre, ASIN, prix, nombre d'avis
- Statut par produit : récupéré / en attente / erreur
- Lien vers la fiche produit détaillée
- Bouton : `Lancer la récupération des produits`

---

## Onglet 3 — Plan

### Barre SEO (au-dessus de l'éditeur)
- Score Serpmantics : `72 / 100` + barre de progression
- Bouton `Recalculer` (appelle l'API score Serpmantics avec le contenu actuel)
- Score affiché automatiquement après la génération du plan

### Champs méta
- Slug
- Meta title
- Meta description
- Légende image principale

### Éditeur WYSIWYG complet
Librairie : **TipTap** (supporte H1-H3, gras, italique, listes, tableaux, images, HTML brut)

Structure du plan généré :
```
## Introduction
Brief : ...
Mots-clés : ...
Mots cible : 300

## Critères de sélection
Brief : ...
Mots-clés : ...
Mots cible : 400

## Produit 1 — [Nom]
Brief : ...
Mots-clés : ...
Mots cible : 600

...

## FAQ
## Sommaire
```

### Actions
- `Générer le plan (IA)` — appelle GPT-4o avec les données produits + mots-clés
- `Valider le plan` — déverrouille l'onglet Article

---

## Onglet 4 — Article

### Barre SEO
Identique à l'onglet Plan.

### Champs méta
Identiques à l'onglet Plan (slug, meta title, meta desc, légende image).

### Éditeur WYSIWYG complet
Même éditeur TipTap. Contenu = article rédigé complet.

### Ordre de génération de l'article
1. Sections produits (une par une, en streaming)
2. Introduction (résumé de toutes les sections produits)
3. FAQ
4. Sommaire avec liste des produits

### Actions
- `Générer l'article (IA)` — lance la génération section par section

---

## Données fictives pour le développement UX

À placer dans `/fixtures/` :
- `guide.json` — données du guide (titre, mots-clés, statut des étapes)
- `products.json` — 3-5 produits fictifs (titre, ASIN, image, prix, avis)
- `plan.json` — plan d'article pré-rempli
- `article.json` — article fictif complet
- `serpmantics-keywords.json` — mots-clés Serpmantics avec occurrences
- `serpmantics-score.json` — réponse fictive de score (72/100 + liste mots-clés)

---

## Base de données — nouveaux champs à ajouter (Prisma)

Sur le modèle `Guide` :
- `selectionCriteria` : String (critères de sélection produits, champ libre)
- `targetWordCount` : Int (calculé : min+max / 2)
- `planHtml` : String (contenu WYSIWYG du plan)
- `articleHtml` : String (contenu WYSIWYG de l'article)
- `slug` : String
- `metaTitle` : String
- `metaDescription` : String
- `imageCaption` : String
- `planSeoScore` : Int (score Serpmantics du plan)
- `articleSeoScore` : Int (score Serpmantics de l'article)
- `currentStep` : Int déjà existant — réutilisé pour indiquer l'étape (1-4)

---

## Stack technique

| Composant | Choix |
|-----------|-------|
| Éditeur WYSIWYG | TipTap (React, extensions : StarterKit, Table, Image) |
| Onglets | shadcn/ui Tabs (déjà installé) |
| Score SEO | Appel `POST /api/serpmantics/score` (à créer) |
| Données fictives | Fichiers JSON dans `/fixtures/` |

---

## Ce qu'on NE fait PAS dans cette phase

- Pas d'appels API réels (Serpmantics, OpenAI, Apify)
- Pas de génération IA
- Pas de migration DB
- Seulement : l'interface avec les données fictives

---

## Prochaine phase (après validation UX)

1. Migration Prisma (nouveaux champs)
2. API routes pour plan et article
3. Intégration GPT-4o (génération plan + article)
4. Intégration score Serpmantics en temps réel
