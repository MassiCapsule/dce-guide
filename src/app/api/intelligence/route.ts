import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeReviews } from "@/lib/intelligence/review-analyzer";
import { mapRawProduct } from "@/lib/scraper/amazon-product";
import { mapRawReviews } from "@/lib/scraper/amazon-reviews";
import { getConfigModel } from "@/lib/config";
import { calculateCost } from "@/lib/pricing";

export async function POST(req: Request) {
  try {
    const { intelligenceId } = await req.json();

    if (!intelligenceId) {
      return NextResponse.json(
        { error: "intelligenceId requis" },
        { status: 400 }
      );
    }

    const intelligence = await prisma.productIntelligence.findUnique({
      where: { id: intelligenceId },
    });

    if (!intelligence) {
      return NextResponse.json(
        { error: "ProductIntelligence introuvable" },
        { status: 404 }
      );
    }

    const rawProductItem = JSON.parse(intelligence.rawProductJson);
    const rawReviewItems = JSON.parse(intelligence.rawReviewsJson);
    const product = mapRawProduct(rawProductItem);
    const reviews = mapRawReviews(rawReviewItems);

    const model = await getConfigModel("analysis");
    const result = await analyzeReviews(product, reviews, model);
    const cost = calculateCost(model, result.promptTokens, result.completionTokens);

    const updated = await prisma.productIntelligence.update({
      where: { id: intelligenceId },
      data: {
        positioningSummary: result.analysis.positioningSummary,
        keyFeatures: JSON.stringify(result.analysis.keyFeatures),
        detectedUsages: JSON.stringify(result.analysis.detectedUsages),
        recurringProblems: JSON.stringify(result.analysis.recurringProblems),
        buyerProfiles: JSON.stringify(result.analysis.buyerProfiles),
        sentimentScore: result.analysis.sentimentScore,
        strengthPoints: JSON.stringify(result.analysis.strengthPoints),
        weaknessPoints: JSON.stringify(result.analysis.weaknessPoints),
        remarkableQuotes: JSON.stringify(result.analysis.remarkableQuotes),
        analyzed: true,
        analysisModelUsed: model,
        analysisPromptTokens: result.promptTokens,
        analysisCompletionTokens: result.completionTokens,
        analysisCost: cost,
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Erreur lors de l'analyse" },
      { status: 500 }
    );
  }
}
