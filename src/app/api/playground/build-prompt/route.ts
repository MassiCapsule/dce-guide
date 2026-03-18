import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAnnotatedFromTemplate } from "@/lib/prompt-builder/annotated";

// Default prompt template if none in DB
const DEFAULT_TEMPLATE = `Tu es un redacteur web expert en SEO et en fiches produit e-commerce. Tu rediges en francais, avec un style engageant et professionnel. Tu produis du HTML semantique propre.

## Ton et style
- **Media** : {media.name}
- **Ton** : {media.toneDescription}
- **Style d'ecriture** : {media.writingStyle}

## Regles a suivre (DO)
{doRules}

## Informations produit
- **Titre** : {intelligence.productTitle}
- **Marque** : {intelligence.productBrand}
- **Prix** : {intelligence.productPrice}
- **ASIN** : {intelligence.asin}
- **Positionnement** : {intelligence.positioningSummary}

### Caracteristiques cles
{intelligence.keyFeatures}

### Usages detectes
{intelligence.detectedUsages}

### Profils acheteurs
{intelligence.buyerProfiles}

## Points forts (issus des avis)
{intelligence.strengthPoints}

## Points faibles (issus des avis)
{intelligence.weaknessPoints}

## Problemes recurrents
{intelligence.recurringProblems}

## Citations remarquables d'acheteurs
{intelligence.remarkableQuotes}

## Mot-cle SEO principal
Le mot-cle principal a cibler est : **{keyword}**
Integre ce mot-cle naturellement dans le titre H1, au moins un H2, l'introduction, et plusieurs fois dans le corps du texte. Ne fais pas de bourrage de mots-cles.

## Brief editorial du plan pour cette fiche
{planSection}

## Objectif de longueur
La fiche produit doit faire environ **{wordCount} mots**.

## Format de sortie
Genere uniquement du HTML semantique propre (h1, h2, h3, p, ul, li, strong, em, blockquote, etc.).
Ne genere PAS de balises html, head, body, doctype ni de code markdown.
Ne genere PAS de blocs de code.
Ne genere PAS de balises img ou d'images.
Commence directement par le contenu HTML.`;

export async function POST(req: NextRequest) {
  try {
    const { intelligenceId, mediaId, keyword, wordCount, planSection } = await req.json();

    if (!intelligenceId || !mediaId) {
      return NextResponse.json(
        { error: "intelligenceId et mediaId sont requis" },
        { status: 400 }
      );
    }

    // Load data in parallel
    const [intelligence, media, promptConfig] = await Promise.all([
      prisma.productIntelligence.findUnique({ where: { id: intelligenceId } }),
      prisma.media.findUnique({ where: { id: mediaId } }),
      prisma.appConfig.findUnique({ where: { key: "prompt_generation" } }),
    ]);

    if (!intelligence) {
      return NextResponse.json(
        { error: "ProductIntelligence introuvable" },
        { status: 404 }
      );
    }

    if (!media) {
      return NextResponse.json(
        { error: "Media introuvable" },
        { status: 404 }
      );
    }

    const template = promptConfig?.value || DEFAULT_TEMPLATE;
    const effectiveKeyword = keyword || intelligence.productTitle;
    const effectiveWordCount = wordCount || media.defaultProductWordCount || 800;

    const result = buildAnnotatedFromTemplate(
      template,
      media,
      intelligence,
      effectiveKeyword,
      effectiveWordCount,
      planSection || undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur build-prompt:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { error: `Erreur lors de la construction du prompt : ${message}` },
      { status: 500 }
    );
  }
}
