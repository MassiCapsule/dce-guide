import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadPrompt, loadForbiddenWords, formatForbiddenWords } from "@/lib/guide/enrichment-step";
import { extractPlanSectionFromJson, resolveGenerationTemplate } from "@/lib/guide/article-generator";
import { parsePlanJson } from "@/lib/guide/plan-types";

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

    // Charger le template + mots interdits depuis Paramètres
    const [template, forbiddenWords] = await Promise.all([
      loadPrompt("prompt_generation"),
      loadForbiddenWords(),
    ]);
    const forbiddenFormatted = formatForbiddenWords(forbiddenWords);

    // Extraire la section du plan pour ce produit (JSON prioritaire, fallback HTML)
    const planSection = extractPlanSectionFromJson(
      guide.planJson,
      guide.planHtml,
      intelligence.asin,
      intelligence.productTitle
    );

    // Nombre de mots : depuis le plan JSON (mots_total), fallback 800
    const planData = parsePlanJson(guide.planJson);
    const planProduct = planData?.produits.find((p) => p.asin === intelligence.asin);
    const wordCount = planProduct?.mots_total || 800;

    // Résoudre le template avec toutes les données
    const resolvedPrompt = resolveGenerationTemplate(
      template,
      guide.media,
      intelligence,
      guide.title,
      wordCount,
      [],
      planSection,
      forbiddenFormatted
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
