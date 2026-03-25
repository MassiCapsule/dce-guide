import { prisma } from "@/lib/prisma";
import { scrapeAndStore } from "@/lib/scraper";
import { analyzeReviews } from "@/lib/intelligence/review-analyzer";
import { mapRawProduct } from "@/lib/scraper/amazon-product";
import { mapRawReviews } from "@/lib/scraper/amazon-reviews";
import { getConfigModel } from "@/lib/config";
import { calculateCost } from "@/lib/pricing";

const MAX_AGE_DAYS = 180;

/**
 * Scrape + analyse tous les produits d'un guide.
 * Status: scraping → analyzing → products-ready (ou error)
 */
export async function executeScrapeAndAnalyze(guideId: string): Promise<void> {
  try {
    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      include: { products: { orderBy: { position: "asc" }, include: { intelligence: true } } },
    });

    if (!guide) throw new Error("Guide introuvable");

    const model = await getConfigModel("generation");
    let totalCost = 0;

    // --- SCRAPING ---
    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "scraping", currentStep: 0 },
    });

    for (let i = 0; i < guide.products.length; i++) {
      await prisma.guide.update({
        where: { id: guideId },
        data: { currentStep: i + 1 },
      });

      const gp = guide.products[i];
      const asin = gp.intelligence.asin;

      const intelligence = await scrapeAndStore(asin, false, MAX_AGE_DAYS);
      totalCost += intelligence.scrapingCost;

      if (intelligence.id !== gp.intelligenceId) {
        await prisma.guideProduct.update({
          where: { id: gp.id },
          data: { intelligenceId: intelligence.id },
        });
      }
    }

    // --- ANALYZING ---
    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "analyzing", currentStep: 0 },
    });

    const freshProducts = await prisma.guideProduct.findMany({
      where: { guideId },
      orderBy: { position: "asc" },
      include: { intelligence: true },
    });

    for (let i = 0; i < freshProducts.length; i++) {
      await prisma.guide.update({
        where: { id: guideId },
        data: { currentStep: i + 1 },
      });

      const fp = freshProducts[i];

      if (!fp.intelligence.analyzed) {
        const rawProductItem = JSON.parse(fp.intelligence.rawProductJson);
        const rawReviewItems = JSON.parse(fp.intelligence.rawReviewsJson);
        const product = mapRawProduct(rawProductItem);
        const reviews = mapRawReviews(rawReviewItems);

        const result = await analyzeReviews(product, reviews, model);
        const cost = calculateCost(model, result.promptTokens, result.completionTokens);

        await prisma.productIntelligence.update({
          where: { id: fp.intelligence.id },
          data: {
            shortTitle: result.analysis.shortTitle,
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

        totalCost += cost;
      } else {
        totalCost += fp.intelligence.analysisCost;
      }
    }

    // --- TRI PAR PRIX (du moins cher au plus cher) ---
    const allProducts = await prisma.guideProduct.findMany({
      where: { guideId },
      include: { intelligence: true },
    });

    const parsePrice = (s: string): number => {
      if (!s) return Infinity;
      // "29,99 €" → 29.99 / "1 234,56 €" → 1234.56
      const cleaned = s.replace(/[^\d,.\s]/g, "").replace(/\s/g, "").replace(",", ".");
      const num = parseFloat(cleaned);
      return isNaN(num) ? Infinity : num;
    };

    const sorted = [...allProducts].sort(
      (a, b) => parsePrice(a.intelligence.productPrice) - parsePrice(b.intelligence.productPrice)
    );

    // D'abord mettre des positions temporaires négatives pour éviter les conflits de contrainte unique
    for (let i = 0; i < sorted.length; i++) {
      await prisma.guideProduct.update({
        where: { id: sorted[i].id },
        data: { position: -(i + 1) },
      });
    }
    // Puis remettre les vraies positions
    for (let i = 0; i < sorted.length; i++) {
      await prisma.guideProduct.update({
        where: { id: sorted[i].id },
        data: { position: i + 1 },
      });
    }

    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "products-ready", currentStep: 0, totalCost },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("Erreur scrape-step:", err);
    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "error", errorMessage: message },
    });
  }
}
