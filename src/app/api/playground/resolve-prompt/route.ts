import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadPrompt } from "@/lib/guide/enrichment-step";
import { extractPlanSection, resolveGenerationTemplate } from "@/lib/guide/article-generator";

export async function POST(req: NextRequest) {
  try {
    const { guideId, intelligenceId } = await req.json();

    if (!guideId || !intelligenceId) {
      return NextResponse.json(
        { error: "guideId et intelligenceId sont requis" },
        { status: 400 }
      );
    }

    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      include: { media: true },
    });

    if (!guide) {
      return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
    }

    const intelligence = await prisma.productIntelligence.findUnique({
      where: { id: intelligenceId },
    });

    if (!intelligence) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    // Charger le template depuis Paramètres
    const template = await loadPrompt("prompt_generation");

    // Extraire la section du plan pour ce produit
    const planSection = extractPlanSection(guide.planHtml, intelligence.productTitle);

    // Résoudre le template avec toutes les données
    const resolvedPrompt = resolveGenerationTemplate(
      template,
      guide.media,
      intelligence,
      guide.title,
      guide.media.defaultProductWordCount,
      [],
      planSection
    );

    return NextResponse.json({
      prompt: resolvedPrompt,
      planSection,
      productTitle: intelligence.productTitle,
    });
  } catch (error) {
    console.error("Erreur resolve-prompt:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
