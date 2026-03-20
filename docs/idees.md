# Idées à explorer

## Bouton "Optimiser le plan" (Tab Plan)

Ajouter un bouton dans le Tab Plan qui envoie le plan actuel + les mots-clés manquants (ceux à 0 occurrence) à OpenAI avec un prompt demandant d'intégrer naturellement ces mots-clés dans le plan.

**Logique envisagée :**
- Prendre `planHtml` actuel + liste des mots-clés à 0 occurrence (depuis `seoKeywords`)
- Envoyer à OpenAI avec un prompt du type : "Voici un plan éditorial HTML. Intègre naturellement les mots-clés suivants dans les sections les plus pertinentes, sans dénaturer le contenu : [liste mots-clés]"
- Remplacer le contenu du RichEditor avec le résultat
- Recalculer le score SEO automatiquement après

**Pourquoi cette idée :** L'insertion manuelle mot-clé par mot-clé (clic sur la pill) ne fonctionnait pas bien — difficile de détecter la bonne section sans contexte sémantique réel. Une réécriture IA du plan avec les mots-clés cibles est plus fiable.

---

## Optimisation coûts — Modèle léger pour l'analyse des avis

L'analyse des avis (scraping step) représente ~33% du coût total d'un guide. C'est de l'extraction de données structurées, pas de la rédaction créative → un modèle moins cher fait très bien le job.

**Idée :** Utiliser Claude Haiku 4 (ou GPT-5.4 nano) pour l'étape d'analyse, garder GPT-5.4 pour la rédaction.

**Gain estimé :** Analyse passe de ~0.28$ à ~0.03$ pour 10 produits (÷10). Coût total d'un guide : ~0.85$ → ~0.60$.

**Comment :** Le modèle d'analyse est déjà configurable séparément dans Paramètres (`model_analysis`). Il suffit de changer le modèle dans l'interface.
