# TODO — fiche-produit-generator

## À faire

- [ ] **Produits** : mettre le bouton "Lancer la récupération" sur toute la largeur
- [ ] **Produits** : afficher le message d'étape en cours sans coupure (pas de `...`)
- [ ] **Création du guide** : notification navigateur quand le guide Serpmantics est prêt
- [ ] **Produits** : notification navigateur quand tous les produits sont récupérés et analysés
- [ ] **Produits** : une fois terminé, afficher un bouton "Créer le plan" qui passe à l'onglet Plan
- [ ] **Plan** : notification navigateur quand le plan est généré
- [ ] **Plan** : une fois le plan généré, afficher un bouton "Passer à l'article" qui passe à l'onglet Article
- [ ] **Score SEO par étape** : calculer et stocker un score Serpmantics séparé pour le plan, l'article V1 et l'article V2. A chaque génération, pousser automatiquement le contenu dans Serpmantics et mettre à jour uniquement le score de la partie concernée (pas les autres)
- [x] **Plan structuré JSON** : générer un JSON structuré en plus du HTML pour fiabiliser l'extraction des sections — implémenté le 2026-03-25
- [ ] **Article — Critères de sélection** : ajouter la section "Critères de sélection" dans l'article (nouveau prompt `prompt_criteres_selection`, nouveau champ DB `criteresHtml`, intégré dans l'assemblage entre sommaire et fiches produits)
- [ ] **Article — Titre FAQ** : le prompt FAQ doit générer un titre H2 éditorialisé (avec le mot-clé principal) avant les questions
- [ ] **Optimisation coûts** : utiliser un modèle moins cher (Claude Haiku 4) pour l'analyse des avis (extraction de données, pas de rédaction créative) — ~10x moins cher pour un résultat comparable
- [ ] **Distribution mots-clés** : actuellement commentée — les mots-clés sont gérés par le plan via `{planSection}`. Réactiver si le score SEO Serpmantics est insuffisant
- [ ] **Fiches produits — vérification process** : vérifier que le pipeline de génération des fiches respecte bien le plan (H2 exacts, briefs suivis, pas de contamination entre produits, bon prix/URL par fiche)
- [ ] **Estimation coût article** : calculer le coût total d'une rédaction complète (ajout produits → scraping → analyse → plan → article V1 → enrichissements → humanisation V2), basé sur le modèle et le nombre de produits
- [ ] **Structuration prompts et données** : réorganiser ce qui est commun à tous les médias (prompts dans Paramètres, logique pipeline) vs ce qui est propre à un média (ton, style, règles, prompt plan, modèle plan). Clarifier la frontière pour faciliter l'ajout de nouveaux médias
