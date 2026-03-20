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

---

## Plan structuré en JSON (remplacer le parsing HTML)

Actuellement le plan est stocké uniquement en HTML (`planHtml`) et on parse les sections par H2/H3/H4 avec du matching flou sur les noms de produits. C'est fragile (titres Amazon en anglais vs plan en français, niveaux de heading variables).

**Idée :** Stocker un `planJson` en plus du `planHtml`. L'IA générerait un JSON structuré avec chaque section clairement identifiée :
- `h1` : titre principal
- `chapo` : brief + mots-clés + nb mots
- `introduction` : brief + mots-clés + nb mots
- `criteres` : titre + brief + mots-clés + nb mots
- `products[]` : pour chaque produit, le titre, l'ASIN, les 4 parties SAVE (avec H2 et brief), les mots-clés, le nb mots, le prix
- `faq` : brief + mots-clés

**Gain :** Plus de parsing HTML, plus de matching flou. On accède directement à `planJson.products[i]` pour chaque fiche. Le lien produit ↔ section est garanti par l'ASIN.

**Comment :** Ajouter un champ `planJson` (String, JSON) au modèle Guide. Modifier le prompt plan pour demander en sortie à la fois le HTML (pour l'éditeur) et un bloc JSON structuré. Ou mieux : générer le JSON d'abord, puis construire le HTML à partir du JSON.
