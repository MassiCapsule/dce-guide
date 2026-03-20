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

Le plan est modifiable dans l'éditeur avant de passer à l'étape suivante.

### Etape 4 — Générer l'article

Dans l'onglet **Article**, cliquer sur **Générer l'article (IA)**.

Le pipeline se lance automatiquement :
1. **Génération des fiches produits** — une par une, en suivant le brief du plan pour chaque produit
2. **Résumé de l'article** — ~200 mots, utilisé comme contexte pour les éléments suivants
3. **4 éléments en parallèle** — chapô + introduction, sommaire, FAQ, meta + slug (chacun reçoit la section du plan correspondante)
4. **Assemblage final** — H1 (extrait du plan) + chapô + sommaire + fiches produits + FAQ

Les éléments SEO (slug, meta title, meta description, légende photo) sont pré-remplis par l'IA et modifiables dans le collapsible "Eléments SEO".

### Etape 5 — Humaniser l'article (V2)

Dans l'onglet **Article V2**, cliquer sur **Générer l'article V2 (Humaniser)**.

L'IA réécrit l'article complet pour éliminer les tics d'écriture IA tout en conservant la structure et le contenu.

### Etape 6 — Corrections manuelles

Chaque onglet dispose d'un éditeur qui permet de modifier librement le contenu HTML généré (titres, texte, listes, tableaux).

---

## Configuration

### Paramètres > Prompts

Tous les prompts sont personnalisables dans `/parametres`. L'outil utilise **uniquement** les prompts configurés ici. Si un prompt manque, une erreur explicite s'affiche.

Les 9 prompts disponibles :

| Prompt | Rôle |
|--------|------|
| Critères Perplexity | Générer les critères de sélection via Perplexity |
| Analyse | Analyser les avis clients d'un produit |
| Génération | Rédiger chaque fiche produit (reçoit `{planSection}` = le brief du produit depuis le plan) |
| Résumé | Résumer l'article complet (~200 mots) |
| Chapô + Intro | Rédiger le chapô et l'introduction (reçoit `{planSection}` = sections Chapô + Introduction du plan) |
| Sommaire | Créer la sélection produits (reçoit `{planSection}` = section Critères du plan) |
| FAQ | Générer les 5 questions/réponses (reçoit `{planSection}` = section FAQ du plan) |
| Méta + Slug | Générer slug, meta title, meta description et légende photo |
| Humaniser | Réécrire l'article en style humain |

Chaque prompt utilise des **placeholders** (variables entre accolades comme `{keyword}`, `{media.name}`, `{resume}`, `{planSection}`, etc.) qui sont remplacés automatiquement par les données réelles au moment de la génération.
