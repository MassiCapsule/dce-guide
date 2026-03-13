import { prisma } from "@/lib/prisma";
import { scrapeAndStore } from "@/lib/scraper";
import { analyzeReviews } from "@/lib/intelligence/review-analyzer";
import { mapRawProduct } from "@/lib/scraper/amazon-product";
import { mapRawReviews } from "@/lib/scraper/amazon-reviews";
import { buildGenerationPrompt } from "@/lib/prompt-builder";
import { generateStream } from "@/lib/generator";
import { cleanHtml, countWords } from "@/lib/generator/html-formatter";
import { distributeKeywords } from "@/lib/keywords/distributor";
import { getConfigModel } from "@/lib/config";
import { calculateCost } from "@/lib/pricing";

const MAX_AGE_DAYS = 180; // 6 mois

async function updateGuideStatus(
  guideId: string,
  status: string,
  currentStep: number = 0,
  errorMessage: string = ""
) {
  await prisma.guide.update({
    where: { id: guideId },
    data: { status, currentStep, errorMessage },
  });
}

/**
 * Execute le pipeline complet de generation d'un guide.
 * Etapes 1-4 cote serveur, etape 5 (guide HTML) sera streamee par le client.
 */
export async function executeGuidePipeline(guideId: string): Promise<void> {
  try {
    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      include: {
        products: { orderBy: { position: "asc" } },
        keywords: true,
        media: true,
      },
    });

    if (!guide) throw new Error("Guide introuvable");

    const model = await getConfigModel();
    let totalCost = 0;

    // --- ETAPE 1: SCRAPING ---
    await updateGuideStatus(guideId, "scraping", 0);

    for (let i = 0; i < guide.products.length; i++) {
      await updateGuideStatus(guideId, "scraping", i + 1);
      const gp = guide.products[i];

      // scrapeAndStore with freshness check
      const intelligence = await scrapeAndStore(
        (await prisma.productIntelligence.findUnique({ where: { id: gp.intelligenceId } }))!.asin,
        false,
        MAX_AGE_DAYS
      );

      totalCost += intelligence.scrapingCost;

      // Update link if intelligence changed
      if (intelligence.id !== gp.intelligenceId) {
        await prisma.guideProduct.update({
          where: { id: gp.id },
          data: { intelligenceId: intelligence.id },
        });
      }
    }

    // --- ETAPE 2: ANALYSE ---
    await updateGuideStatus(guideId, "analyzing", 0);

    // Reload products to get fresh intelligenceIds
    const freshProducts = await prisma.guideProduct.findMany({
      where: { guideId },
      orderBy: { position: "asc" },
      include: { intelligence: true },
    });

    for (let i = 0; i < freshProducts.length; i++) {
      await updateGuideStatus(guideId, "analyzing", i + 1);
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

    // --- ETAPE 3: DISTRIBUTION MOTS-CLES ---
    await updateGuideStatus(guideId, "distributing", 0);

    const keywordSpecs = guide.keywords.map((k) => ({
      keyword: k.keyword,
      minOccurrences: k.minOccurrences,
      maxOccurrences: k.maxOccurrences,
    }));

    const allocations = distributeKeywords(keywordSpecs, freshProducts.length);

    for (let i = 0; i < freshProducts.length; i++) {
      await prisma.guideProduct.update({
        where: { id: freshProducts[i].id },
        data: {
          keywordAllocation: JSON.stringify(allocations[i].keywords),
        },
      });
    }

    // --- ETAPE 4: GENERATION FICHES INDIVIDUELLES ---
    await updateGuideStatus(guideId, "generating", 0);

    // Reload with updated intelligence
    const readyProducts = await prisma.guideProduct.findMany({
      where: { guideId },
      orderBy: { position: "asc" },
      include: { intelligence: true },
    });

    for (let i = 0; i < readyProducts.length; i++) {
      await updateGuideStatus(guideId, "generating", i + 1);
      const rp = readyProducts[i];
      const allocation = JSON.parse(rp.keywordAllocation) as { keyword: string; targetCount: number }[];

      // Primary keyword = the one with highest allocation
      const primaryKeyword = allocation.length > 0
        ? allocation.sort((a, b) => b.targetCount - a.targetCount)[0].keyword
        : guide.title;

      const prompt = buildGenerationPrompt(
        guide.media,
        rp.intelligence,
        primaryKeyword,
        guide.media.defaultProductWordCount,
        allocation
      );

      const { stream, getUsage } = await generateStream(prompt, model);

      let fullContent = "";
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) fullContent += text;
      }

      const usage = getUsage();
      const promptTokens = usage?.promptTokens || 0;
      const completionTokens = usage?.completionTokens || 0;
      const genCost = calculateCost(model, promptTokens, completionTokens);
      totalCost += genCost;

      const cleaned = cleanHtml(fullContent);
      const wordCount = countWords(cleaned);

      const card = await prisma.generatedProductCard.create({
        data: {
          asin: rp.intelligence.asin,
          keyword: primaryKeyword,
          wordCount,
          contentHtml: cleaned,
          promptUsed: prompt,
          modelUsed: model,
          tokensUsed: promptTokens + completionTokens,
          promptTokens,
          completionTokens,
          generationCost: genCost,
          mediaId: guide.media.id,
          intelligenceId: rp.intelligence.id,
        },
      });

      await prisma.guideProduct.update({
        where: { id: rp.id },
        data: { generatedCardId: card.id },
      });
    }

    // --- Termine ---
    await prisma.guide.update({
      where: { id: guideId },
      data: { totalCost, status: "complete", currentStep: 0 },
    });
  } catch (err: any) {
    console.error("Erreur pipeline guide:", err);
    await updateGuideStatus(guideId, "error", 0, err.message || "Erreur inconnue");
  }
}
