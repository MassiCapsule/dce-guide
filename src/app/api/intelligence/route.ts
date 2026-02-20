import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeReviews } from "@/lib/intelligence/review-analyzer";

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

    const rawProduct = JSON.parse(intelligence.rawProductJson);
    const rawReviews = JSON.parse(intelligence.rawReviewsJson);

    const analysis = await analyzeReviews(rawProduct, rawReviews);

    const updated = await prisma.productIntelligence.update({
      where: { id: intelligenceId },
      data: {
        positioningSummary: analysis.positioningSummary,
        keyFeatures: JSON.stringify(analysis.keyFeatures),
        detectedUsages: JSON.stringify(analysis.detectedUsages),
        recurringProblems: JSON.stringify(analysis.recurringProblems),
        buyerProfiles: JSON.stringify(analysis.buyerProfiles),
        sentimentScore: analysis.sentimentScore,
        strengthPoints: JSON.stringify(analysis.strengthPoints),
        weaknessPoints: JSON.stringify(analysis.weaknessPoints),
        remarkableQuotes: JSON.stringify(analysis.remarkableQuotes),
        analyzed: true,
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
