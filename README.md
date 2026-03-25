# Guide d'Achat Generator

Outil de création de guides d'achat SEO avec fiches produits Amazon.

## Ce que fait l'outil

A partir d'un mot-clé et d'un profil éditorial (média), l'outil génère un guide d'achat complet et optimisé SEO :
- Récupère automatiquement les données et avis des produits Amazon
- Analyse les avis avec l'IA pour en extraire les points forts, faibles, usages, etc.
- Génère un plan d'article structuré
- Rédige chaque fiche produit individuellement en suivant le plan
- Ajoute automatiquement : chapô, introduction, sommaire, FAQ, meta title, meta description, légende photo, slug
- Propose une version "humanisée" (V2) pour un style plus naturel

---

## Les 6 étapes pour créer un guide

### Etape 1 — Créer le guide

Aller sur `/guides/nouveau`, saisir le **mot-clé principal** (ex: "meilleur robot pâtissier") et choisir un **média** (profil éditorial).

L'outil interroge Serpmantics pour récupérer les mots-clés SEO et le nombre de mots recommandé.

### Etape 2 — Ajouter les produits

Dans l'onglet **Produits**, coller les codes ASIN Amazon (un par ligne), puis cliquer sur **Lancer la récupération**.

L'outil scrape les données produit et analyse les avis clients avec l'IA. Les produits sont automatiquement triés du moins cher au plus cher.

### Etape 3 — Générer le plan

Dans l'onglet **Plan**, renseigner les **critères de sélection** (possibilité de les générer via Perplexity), puis cliquer sur **Générer le plan (IA)**.

L'IA produit un plan éditorial détaillé avec pour chaque produit :
- Les 4 parties SAVE (Situation, Atout, Valeur, Evidence)
- Les mots-clés à utiliser
- Le nombre de mots cible
- Les briefs pour le chapô, l'introduction, les critères et la FAQ

Le plan est généré en double format : HTML (visible et modifiable dans l'éditeur) et JSON structuré (utilisé en interne pour garantir que chaque section est correctement extraite lors de la rédaction).

Le plan est modifiable dans l'éditeur avant de passer à l'étape suivante.

### Etape 4 — Générer l'article

Dans l'onglet **Article**, cliquer sur **Générer l'article (IA)**.

Le pipeline se lance automatiquement :
1. **Génération des fiches produits** — une par une, en suivant le brief du plan pour chaque produit
2. **Résumé de l'article** — ~200 mots, utilisé comme contexte pour les éléments suivants
3. **5 éléments en parallèle** — chapô + introduction, sommaire, critères de sélection, FAQ, meta + slug (chacun reçoit la section du plan correspondante : briefs, items, liste produits)
4. **Assemblage final** — H1 (extrait du plan) + chapô + sommaire + fiches produits + FAQ

Les éléments SEO (slug, meta title, meta description, légende photo) sont pré-remplis par l'IA et modifiables dans le collapsible "Eléments SEO".

### Etape 5 — Humaniser l'article (V2)

Dans l'onglet **Article V2**, cliquer sur **Générer l'article V2 (Humaniser)**.

L'IA réécrit l'article complet pour éliminer les tics d'écriture IA tout en conservant la structure et le contenu.

### Etape 6 — Corrections manuelles

Chaque onglet dispose d'un éditeur qui permet de modifier librement le contenu HTML généré (titres, texte, listes, tableaux).

---

## Configuration

### Vos prompts, votre style

L'outil s'adapte entièrement à votre ligne éditoriale. 9 prompts personnalisables pilotent chaque étape de la rédaction, tous modifiables dans Paramètres :

1. **Critères Perplexity** — Définissez comment l'IA recherche les critères de comparaison pour vos produits
2. **Analyse** — Guidez l'extraction des points forts, faibles et usages depuis les avis clients Amazon
3. **Génération** — Le coeur de la rédaction : chaque fiche produit est rédigée en suivant le brief du plan
4. **Résumé** — L'article complet est résumé en ~200 mots pour servir de contexte aux éléments suivants
5. **Chapô + Introduction** — Le bloc d'accroche qui donne envie de lire, calibré sur le brief du plan
6. **Sommaire** — La sélection éditoriale des produits, avec liens et descriptions courtes
7. **FAQ** — 5 questions/réponses pensées pour le lecteur et le référencement
8. **Méta + Slug** — Les éléments SEO essentiels : URL, titre, description et légende photo
9. **Humaniser** — La réécriture finale qui efface les tics d'écriture IA

Chaque prompt utilise des variables (entre accolades) qui sont remplacées automatiquement par les données réelles : nom du média, mot-clé, résumé, brief du plan, données produit, etc.

---

## Post-traitements automatiques

Après chaque génération (article V1, V2, relance intro+FAQ), trois corrections sont appliquées automatiquement sur le HTML :

1. **Suppression du gras dans le corps de texte** — Les balises `<strong>` sont retirées partout sauf dans les titres (h1 à h6) et le chapô (`<p class="chapo">`). L'IA a tendance à abuser du gras, ce traitement garantit un rendu éditorial propre.

2. **Majuscule en début de phrase** — Après un point `.`, un point d'exclamation `!` ou un point d'interrogation `?`, la lettre suivante est forcée en majuscule.

3. **Minuscule après les deux-points** — Après le signe `:`, la lettre suivante est forcée en minuscule. Si un nom propre se retrouve en minuscule par erreur, il faut le corriger manuellement dans l'éditeur.

4. **Majuscule en début de titre** — Le premier caractère de chaque H1, H2 et H3 est forcé en majuscule (corrige les noms de marques en minuscule comme "eufy" → "Eufy" en début de titre).

5. **Gras forcé sur le chapô** — Le contenu du `<p class="chapo">` est automatiquement enveloppé dans `<strong>`, que l'IA l'ait mis en gras ou non.

---

## Paramètres IA par étape

| Étape | Température | Modèle |
|-------|-------------|--------|
| Chapô + Introduction | 0.9 | `model_generation` |
| Méta + H1 (slug, meta title, description, légende, propositions H1) | 0.9 | `model_generation` |
| Sommaire, Critères, FAQ | 0.7 | `model_generation` |
| Fiches produits | 0.7 | `model_generation` |
| Résumé | 0.7 | `model_generation` |
| Humanisation (V2) | 0.7 | `model_humanization` |
