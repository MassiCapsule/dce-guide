# Design — Enrichissement article (chapô, sommaire, FAQ, méta)

**Date** : 2026-03-20
**Statut** : Validé

## Problème

L'article généré ne contient que le corps (fiches produits). Il manque :
- Chapô (30 mots) + Introduction (100 mots)
- Sommaire / sélection produits (200 mots)
- FAQ (250 mots)
- Meta title, meta description, légende photo, slug

## Approche retenue

**Approche C — 1 clic, stockage séparé.**

Le bouton "Générer l'article (IA)" lance tout le pipeline. Chaque élément est stocké séparément en DB pour permettre une re-génération individuelle future. Le `guideHtml` est l'assemblage final.

5 appels IA distincts en parallèle (après le résumé) : meilleure qualité, surcoût négligeable (~0.01$), même temps d'attente grâce à la parallélisation.

---

## 1. Base de données — Nouveaux champs Guide

| Champ | Type | Rôle |
|-------|------|------|
| `articleSummary` | String @default("") | Résumé de l'article (~200 mots) |
| `chapoHtml` | String @default("") | Chapô (30 mots) + Introduction (100 mots) |
| `sommaireHtml` | String @default("") | Sommaire / sélection produits |
| `faqHtml` | String @default("") | FAQ 5 questions |
| `metaTitle` | String @default("") | Meta title généré par IA |
| `metaDescription` | String @default("") | Meta description générée par IA |
| `imageCaption` | String @default("") | Légende photo générée par IA |
| `slug` | String @default("") | Slug URL généré par IA |

---

## 2. Pipeline de génération

```
Étape 1 — Distribution mots-clés          (status: distributing)
    ↓
Étape 2 — Génération fiches produits       (status: generating, currentStep 1/N)
    ↓
Étape 3 — Assemblage corps + Résumé IA     (status: summarizing)
    ↓
Étape 4 — 4 appels en parallèle           (status: enriching)
    ├─ Chapô + Introduction
    ├─ Sommaire
    ├─ FAQ
    └─ Méta + Légende + Slug
    ↓
Étape 5 — Assemblage final                 (status: complete)
    guideHtml = chapoHtml + sommaireHtml + [fiches] + faqHtml
    MetaFields pré-remplis (slug, metaTitle, metaDescription, imageCaption)
```

### Progression UI

| Status | Label affiché | % |
|--------|--------------|---|
| `distributing` | Distribution des mots-clés... | 5% |
| `generating` | Génération fiche 1/N... | 5–60% |
| `summarizing` | Résumé de l'article... | 65% |
| `enriching` | Génération des éléments... | 70–95% |
| `complete` | Terminé | 100% |

### Parallélisation étape 4

`Promise.all()` pour les 4 appels. Si un appel échoue, les autres continuent — le champ en erreur reste vide (éditable manuellement).

---

## 3. Prompts — AppConfig

### Nouvelles clés

| Clé AppConfig | Placeholders | Rôle |
|---------------|-------------|------|
| `prompt_resume` | `{article}` | Résumer l'article en ~200 mots |
| `prompt_chapo` | `{media.name}`, `{media.toneDescription}`, `{media.writingStyle}`, `{forbiddenWords}`, `{resume}`, `{keyword}` | Chapô 30 mots + Introduction 100 mots |
| `prompt_sommaire` | `{media.name}`, `{media.toneDescription}`, `{media.writingStyle}`, `{forbiddenWords}`, `{resume}`, `{keyword}` | Sommaire / sélection produits |
| `prompt_faq` | `{media.name}`, `{media.toneDescription}`, `{media.writingStyle}`, `{forbiddenWords}`, `{resume}`, `{keyword}` | FAQ 5 questions |
| `prompt_meta` | `{media.name}`, `{media.toneDescription}`, `{media.writingStyle}`, `{forbiddenWords}`, `{resume}`, `{keyword}` | Meta title + Meta description + Légende photo + Slug |

### Modèle IA

Tous les éléments complémentaires utilisent le modèle `model_generation` configuré globalement. Pas de sélecteur par élément.

### Prompts par défaut (fallbacks hardcodés)

#### prompt_resume
```
Résume cet article de guide d'achat en 200 mots maximum. Le résumé doit capturer : le sujet principal, les produits présentés (noms et positionnement), les critères de choix, et la promesse éditoriale. Style factuel et synthétique.

Article :
{article}
```

#### prompt_chapo
```
Tu es un rédacteur web expert en journalisme éditorial pour {media.name}.
Ton : {media.toneDescription}
Style : {media.writingStyle}
Mots interdits : {forbiddenWords}

Ta tâche est de rédiger un chapô de 30 mots suivi d'une introduction de 100 mots qui forment ensemble un bloc d'entrée cohérent et complémentaire — sans jamais se répéter.

Chapô (30 mots exactement)
Pose le sujet de façon dense et synthétique en couvrant : le thème central, le périmètre traité et l'angle éditorial. Contraintes strictes : aucune question, aucun chiffre de prix, aucun exemple de produit spécifique.

Introduction (100 mots exactement)
Structure le texte en suivant les 5W dans cet ordre précis :
- Qui — le lecteur cible, celui qui est directement concerné par le sujet
- Quoi — le problème concret ou le besoin réel qu'il rencontre
- Où — le contexte d'usage : lieu, situation, environnement
- Quand — la fréquence ou le moment déclencheur
- Pourquoi — ce que ce contenu lui apporte concrètement

L'introduction ne reformule pas le chapô. Elle développe, contextualise et crée l'envie de lire la suite. Les deux blocs se complètent : le chapô cadre, l'introduction engage.

Ton et style : direct, concret et utile. Pas de superlatifs, pas de formules creuses. Chaque phrase doit apporter une information ou créer une attente chez le lecteur.

Le résultat final est un bloc continu et cohérent — pas deux résumés du même contenu.

Mot-clé principal : {keyword}

Résumé de l'article :
{resume}
```

#### prompt_sommaire
```
::: Contexte :::
Vous êtes un rédacteur expert spécialisé dans la création de guides d'achat pour {media.name}.
Ton : {media.toneDescription}
Style : {media.writingStyle}
Mots interdits : {forbiddenWords}

::: Mission :::
Transformer une liste de produits fournie par l'utilisateur en une sélection éditoriale formatée selon des règles précises de présentation.

La sélection doit commencer par un titre H2 personnalisé, suivie d'une liste à puces où chaque produit apparaît sur UNE SEULE LIGNE COMPLÈTE (tiret, nom en gras, deux-points, description, URL), puis se terminer par 10 propositions de titres H2 alternatifs pour introduire cette même sélection dans différents contextes éditoriaux.

::: Structure du sommaire :::

> Structure exacte à respecter pour chaque sélection :

1. Titre principal au format : "Notre sélection de #NomduProduit pour #promesse" (en H2)

2. Liste à puces avec pour chaque produit :
   - **Nom du produit** (en gras uniquement) : description complète en une phrase URL complète en clair qui commence par un qualificatif

> Contraintes à respecter
- Aucun retour à la ligne ne doit séparer ces trois éléments : Nom du produit, description et url
- Majuscule uniquement en début de phrase et sur les noms propres
- Une description de moins de 15 mots

::: Structure des H2 :::

Proposer 10 titres H2 alternatifs :
- Tous distincts et originaux
- Variés dans leur approche (bénéfice, nombre, émotion, besoin)
- Clairs et incitatifs
- Reflétant des besoins ou envies concrètes du lecteur

> Ton et style éditorial :
- Accessible et compréhensible par tous
- Concret avec des bénéfices tangibles
- Orienté vers l'utilisation réelle au quotidien
- Éviter le jargon technique excessif
- Privilégier les formulations qui parlent au lecteur

Mot-clé principal : {keyword}

Résumé de l'article :
{resume}
```

#### prompt_faq
```
Tu es un rédacteur expert pour {media.name}.
Ton : {media.toneDescription}
Style : {media.writingStyle}
Mots interdits : {forbiddenWords}

Génère une FAQ de 5 questions qui respectent ces règles :

0. La FAQ doit être utile aux lecteurs de cet article
1. Question posée comme si on était sur Google ou un LLM (en gras balisé en H3)
2. Réponses de 35 mots sans gras
3. Classé les questions du global au particulier
4. Pas de numéro ni emoji devant les questions en gras

Mot-clé principal : {keyword}

Résumé de l'article :
{resume}
```

#### prompt_meta
```
Tu es un rédacteur SEO expert pour {media.name}.
Ton : {media.toneDescription}
Style : {media.writingStyle}
Mots interdits : {forbiddenWords}

Génère les éléments suivants basés sur l'ensemble du contenu fourni :

1. Un slug URL (minuscules, tirets, sans accents, 3-5 mots)
2. Un méta title (question, 55-60 caractères espaces inclus)
3. Une méta description (réponse directe, 150-160 caractères espaces inclus)
4. Une légende photo courte qui apporte une info complémentaire à l'article

Compte chaque caractère manuellement. Format attendu :

Slug : [texte]
Méta Title (X caractères) : [texte]
Méta Description (X caractères) : [texte]
Légende : [texte]

Mot-clé principal : {keyword}

Résumé de l'article :
{resume}
```

---

## 4. Page Paramètres — Ordre des prompts

1. Critères Perplexity _(existant)_
2. Analyse _(existant)_
3. Génération _(existant)_
4. **Résumé** _(nouveau)_
5. **Chapô + Introduction** _(nouveau)_
6. **Sommaire** _(nouveau)_
7. **FAQ** _(nouveau)_
8. **Méta + Slug** _(nouveau)_
9. Humaniser _(existant)_

Pas de sélecteur de modèle par élément. Tous utilisent `model_generation`.

---

## 5. Tab Article — UI

### Barre de progression enrichie

Affiche les étapes : distributing → generating 1/N → summarizing → enriching → complete.

### MetaFields pré-remplis

Après génération, les champs "Éléments SEO" sont automatiquement remplis :
- Slug (nouveau champ)
- Meta title
- Meta description
- Légende photo

Éditables dans le collapsible. Bouton "Sauvegarder" persiste via `PATCH /api/guides/[id]`.

### Contenu RichEditor

```html
<!-- Chapô + Introduction -->
<p>...</p>

<!-- Sommaire / Sélection -->
<h2>Notre sélection de...</h2>
<ul>...</ul>

<!-- Fiches produits (corps) -->
<h2>Produit 1</h2>
...

<!-- FAQ -->
<h3>Question 1 ?</h3>
<p>...</p>
```

### Tab Article V2

Aucun changement. L'humanisation prend le `guideHtml` complet (qui inclut maintenant tous les éléments).

---

## 6. API Routes

| Route | Méthode | Changement |
|-------|---------|------------|
| `/api/guides/[id]/article` | POST | Étendu : lance le pipeline complet (fiches + résumé + éléments + assemblage) |
| `/api/guides/[id]/status` | GET | Nouveaux statuts : `summarizing`, `enriching` |
| `/api/guides/[id]` | PATCH | Accepte aussi : `metaTitle`, `metaDescription`, `imageCaption`, `slug` |
| `/api/config/prompts` | GET | Retourne aussi les 5 nouveaux prompts par défaut |
