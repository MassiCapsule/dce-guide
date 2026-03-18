import { NextResponse } from "next/server";
import { DEFAULT_PLAN_PROMPT } from "@/lib/guide/plan-generator";

const ANALYSIS_PROMPT = `## Prompt d'analyse des avis (review-analyzer)

**System** :
Tu es un expert analyste produit. Tu analyses les donnees produit et les avis clients pour en extraire une intelligence produit structuree. Tu reponds toujours en francais et en JSON valide.

**User** :
Analyse le produit suivant et ses avis clients. Fournis une analyse structuree en JSON.

## Produit
- Titre : {title}
- Marque : {brand}
- Prix : {price}
- Note : {rating}/5 ({reviewCount} avis)
- Description : {description}
- Caracteristiques : {features}

## Avis clients ({count} avis)
[Avis 1] Note: X/5 | Verifie: Oui/Non
Titre: ...
Texte...

## Format de reponse attendu (JSON)
{
  "shortTitle": "Titre court du produit (marque + gamme + caracteristique cle, ex: Bosch OptiMUM 1600 W)",
  "positioningSummary": "Resume du positionnement produit en 2-3 phrases",
  "keyFeatures": ["caracteristique cle 1", ...],
  "detectedUsages": ["usage detecte 1", ...],
  "recurringProblems": ["probleme recurrent 1", ...],
  "buyerProfiles": ["profil acheteur 1", ...],
  "sentimentScore": 0.0 a 1.0,
  "strengthPoints": ["point fort 1", ... (8 a 12)],
  "weaknessPoints": ["point faible 1", ... (5 a 8)],
  "remarkableQuotes": ["citation 1", ... (6 a 12)]
}`;

const GENERATION_PROMPT = `## Prompt de generation de fiche (prompt-builder)

**System** (assemble dynamiquement) :

1. Tu es un redacteur web expert en SEO et en fiches produit e-commerce.
   Tu rediges en francais, avec un style engageant et professionnel.
   Tu produis du HTML semantique propre.

2. ## Ton et style
   - Media : {media.name}
   - Ton : {media.toneDescription}
   - Style d'ecriture : {media.writingStyle}

3. ## Regles a suivre (DO)
   - {doRules[0]}, {doRules[1]}, ...

4. ## Regles a eviter (DON'T)
   - {dontRules[0]}, {dontRules[1]}, ...

5. ## Informations produit
   - Titre : {intelligence.productTitle}
   - Marque : {intelligence.productBrand}
   - Prix : {intelligence.productPrice}
   - ASIN : {intelligence.asin}
   - Positionnement : {intelligence.positioningSummary}  ← RESULTAT ANALYSE
   ### Caracteristiques cles ← RESULTAT ANALYSE
   - {intelligence.keyFeatures[0]}, {intelligence.keyFeatures[1]}, ...
   ### Usages detectes ← RESULTAT ANALYSE
   - {intelligence.detectedUsages[0]}, ...
   ### Profils acheteurs ← RESULTAT ANALYSE
   - {intelligence.buyerProfiles[0]}, ...

6. ## Points forts (issus des avis) ← RESULTAT ANALYSE
   - {intelligence.strengthPoints[0]}, ... (8-12 points)
   ## Points faibles (issus des avis) ← RESULTAT ANALYSE
   - {intelligence.weaknessPoints[0]}, ... (5-8 points)

7. ## Problemes recurrents ← RESULTAT ANALYSE
   - {intelligence.recurringProblems[0]}, ...
   ## Citations remarquables d'acheteurs ← RESULTAT ANALYSE
   > "{intelligence.remarkableQuotes[0]}", ... (6-12 citations)

8. ## Mot-cle SEO principal
   Le mot-cle a cibler est : {keyword}
   Integre-le naturellement dans H1, H2, intro et corps du texte.

9. ## Structure de la fiche produit
   {media.productStructureTemplate}

10. ## Objectif de longueur
    Environ {wordCount} mots (± 15%)

11. ## Format de sortie
    HTML semantique (h1, h2, h3, p, ul, li, strong, em, blockquote).
    Pas de html/head/body/doctype, pas de markdown, pas d'images.

**User** :
Genere la fiche produit complete en suivant les instructions ci-dessus.`;

const CRITERES_PROMPT = `Je crée un guide d'achat sur : #MotClesprincipal Merci de me donner les 5 critères essentiels pour les choisir sous forme d'une liste numéroté dans une black windows Pour chaque critère, je veux une mini-explication. Le critère et son explication sur la même ligne Je ne veux pas que tu fasses apparaître les sources`;

export async function GET() {
  return NextResponse.json({
    analysis: ANALYSIS_PROMPT,
    generation: GENERATION_PROMPT,
    criteres: CRITERES_PROMPT,
    plan: DEFAULT_PLAN_PROMPT,
  });
}
