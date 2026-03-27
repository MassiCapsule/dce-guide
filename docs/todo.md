# TODO — fiche-produit-generator

## En cours

(rien en cours)

## À faire — Prioritaire

- [ ] **Simplifier le process avec 2 onglets** : refonte UX — 2 onglets (Formulaire + Contenu) au lieu de 5. Formulaire = mot-clé, média, critères, produits. Contenu = sous-onglets Plan / Article / V1 brut. Barre de progression en haut (toujours visible)
- [ ] **Coût API par article** : afficher le coût LLM détaillé pour chaque article terminé (Plan, V1, V2 séparément)
- [ ] **Dashboard de production** : vue claire de tous les guides avec statut, date, coût, score SEO — pour suivre la production d'ensemble
- [ ] **Accès en ligne sécurisé** : déployer l'outil en ligne pour les équipes (authentification, sécurisation des accès, gestion des rôles)

## À faire — UX / UI

- [ ] **Produits** : mettre le bouton "Lancer la récupération" sur toute la largeur
- [ ] **Produits** : afficher le message d'étape en cours sans coupure (pas de `...`)
- [ ] **Produits** : une fois terminé, afficher un bouton "Créer le plan" qui passe à l'onglet Plan
- [ ] **Plan** : une fois le plan généré, afficher un bouton "Passer à l'article" qui passe à l'onglet Article
- [ ] **Guide — modifier le mot-clé** : permettre de modifier le mot-clé principal d'un guide existant

## À faire — Notifications

- [ ] **Notification globale** : notification navigateur quand un contenu est prêt (plan, article, humanisation) ou si une erreur est intervenue pendant la génération
- [ ] **Création du guide** : notification navigateur quand le guide Serpmantics est prêt
- [ ] **Produits** : notification navigateur quand tous les produits sont récupérés et analysés
- [ ] **Plan** : notification navigateur quand le plan est généré

## À faire — SEO / Qualité

- [ ] **Score SEO par étape** : calculer et stocker un score Serpmantics séparé pour le plan, l'article V1 et l'article V2
- [ ] **Distribution mots-clés** : actuellement commentée — les mots-clés sont gérés par le plan via `{planSection}`. Réactiver si le score SEO Serpmantics est insuffisant

## À faire — Technique

- [ ] **Structuration prompts et données** : réorganiser ce qui est commun à tous les médias vs ce qui est propre à un média

## Terminé

- [x] **Critères d'achat auto (IA)** : bouton "Générer (IA)" dans Tab Plan + prompt `prompt_criteres_auto` configurable dans Paramètres — 2026-03-27
- [x] **Prompt plan obligatoire** : plus de fallback hardcodé `DEFAULT_PLAN_PROMPT`, erreur si `media.promptPlan` est vide — 2026-03-27
- [x] **CLAUDE.md mis à jour** : documentation alignée avec les changements du 2026-03-27
- [x] **Onglet Article V1 supprimé** : l'onglet "Article" (V1) a été supprimé, "Article V2" renommé en "Article". Le V1 reste visible en collapsible dans l'onglet Article — 2026-03-27
- [x] **Bouton "Générer l'article"** : enchaîne automatiquement V1 → V2 avec progression détaillée (distributing → generating → summarizing → enriching → humanizing) — 2026-03-27
- [x] **Plan structuré JSON** : JSON structuré en plus du HTML pour fiabiliser l'extraction des sections — 2026-03-25
- [x] **Article — Critères de sélection** : section "Critères de sélection" dans l'article — 2026-03-25
- [x] **Article — Titre FAQ** : titre H2 éditorialisé avec mot-clé principal — 2026-03-25
- [x] **Optimisation coûts** : 2 modèles IA (V1 + V2) configurables dans Paramètres — 2026-03-25
- [x] **Fiches produits — vérification process** : pipeline respecte le plan JSON enrichi — 2026-03-25
