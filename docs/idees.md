# Idées à explorer

## Bouton "Optimiser le plan" (Tab Plan)

Ajouter un bouton dans le Tab Plan qui envoie le plan actuel + les mots-clés manquants (ceux à 0 occurrence) à OpenAI avec un prompt demandant d'intégrer naturellement ces mots-clés dans le plan.

**Logique envisagée :**
- Prendre `planHtml` actuel + liste des mots-clés à 0 occurrence (depuis `seoKeywords`)
- Envoyer à OpenAI avec un prompt du type : "Voici un plan éditorial HTML. Intègre naturellement les mots-clés suivants dans les sections les plus pertinentes, sans dénaturer le contenu : [liste mots-clés]"
- Remplacer le contenu du RichEditor avec le résultat
- Recalculer le score SEO automatiquement après

**Pourquoi cette idée :** L'insertion manuelle mot-clé par mot-clé (clic sur la pill) ne fonctionnait pas bien — difficile de détecter la bonne section sans contexte sémantique réel. Une réécriture IA du plan avec les mots-clés cibles est plus fiable.
