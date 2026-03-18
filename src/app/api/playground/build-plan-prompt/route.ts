import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfigModel } from "@/lib/config";
import { DEFAULT_PLAN_PROMPT } from "@/lib/guide/plan-generator";
import { buildPlanAnnotated } from "@/lib/prompt-builder/plan-annotated";

export async function POST(req: NextRequest) {
  try {
    const { guideId } = await req.json();

    if (!guideId) {
      return NextResponse.json({ error: "guideId est requis" }, { status: 400 });
    }

    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      include: {
        products: {
          orderBy: { position: "asc" },
          include: { intelligence: true },
        },
        keywords: { orderBy: { id: "asc" } },
        media: true,
      },
    });

    if (!guide) {
      return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
    }

    // Build product summaries (same logic as plan-generator.ts)
    const resumeProduits = guide.products
      .map((gp, i) => {
        const intel = gp.intelligence;
        const brand = intel.productBrand ? `${intel.productBrand} — ` : "";
        const summary = intel.positioningSummary || "(pas encore analysé)";
        const price = intel.productPrice || "prix non disponible";
        const url = `https://www.amazon.fr/dp/${intel.asin}`;
        return `${i + 1}. ${brand}${intel.productTitle || intel.asin}\n   Prix : ${price}\n   URL : ${url}\n   ${summary}`;
      })
      .join("\n");

    // Build keywords list — triés par importance (minOccurrences décroissant)
    const motsCles = [...guide.keywords]
      .sort((a, b) => b.minOccurrences - a.minOccurrences)
      .map((k) => `${k.keyword} (${k.minOccurrences}-${k.maxOccurrences}x)`)
      .join(", ");

    // Average word count
    const avgWordCount =
      guide.wordCountMin > 0
        ? Math.round(((guide.wordCountMin + guide.wordCountMax) / 2) / 100) * 100
        : 3000;

    // Resolve prompt template: media.promptPlan > DEFAULT_PLAN_PROMPT
    const promptTemplate = guide.media?.promptPlan?.trim() || DEFAULT_PLAN_PROMPT;

    // Resolve model: media.modelPlan > global model_plan
    const modelPlan = guide.media?.modelPlan?.trim() || await getConfigModel("plan");

    // Parse forbidden words from media
    const bullet = (s: string) => s.startsWith("- ") ? s : `- ${s}`;
    let forbiddenWords = "";
    if (guide.media?.forbiddenWords) {
      try {
        const words: string[] = JSON.parse(guide.media.forbiddenWords);
        forbiddenWords = words.map(bullet).join("\n");
      } catch { /* ignore parse errors */ }
    }

    const result = buildPlanAnnotated(promptTemplate, {
      mediaName: guide.media?.name || "le média",
      motClePrincipal: guide.title,
      nombreMots: avgWordCount,
      criteres: guide.criteria || "Aucun critère spécifié",
      resumeProduits: resumeProduits || "Aucun produit",
      motsCles: motsCles || "Aucun mot-clé",
      forbiddenWords,
      toneDescription: guide.media?.toneDescription || "",
      writingStyle: guide.media?.writingStyle || "",
    });

    return NextResponse.json({
      ...result,
      mediaName: guide.media?.name || "",
      modelPlan,
    });
  } catch (error) {
    console.error("Erreur build-plan-prompt:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { error: `Erreur lors de la construction du prompt plan : ${message}` },
      { status: 500 }
    );
  }
}
