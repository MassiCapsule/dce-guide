import { prisma } from "@/lib/prisma";
import { buildGenerationPrompt } from "@/lib/prompt-builder";
import { generateStream } from "@/lib/generator";
import { cleanHtml, countWords } from "@/lib/generator/html-formatter";
import { distributeKeywords } from "@/lib/keywords/distributor";
import { getConfigModel } from "@/lib/config";
import { calculateCost } from "@/lib/pricing";
import { generateSummary, generateEnrichments } from "./enrichment-step";

/**
 * Extrait la section HTML du plan correspondant à un produit donné.
 * Cherche le H2 contenant le nom du produit et retourne tout jusqu'au H2 suivant.
 */
function extractPlanSection(planHtml: string, productTitle: string): string {
  if (!planHtml || !productTitle) return "";

  // Normalise pour la comparaison (minuscules, sans ponctuation excessive)
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  const normalizedTitle = normalize(productTitle);

  // Découpe le plan par balises H2
  const h2Regex = /(<h2[\s\S]*?<\/h2>)/gi;
  const parts = planHtml.split(h2Regex).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/<h2/i.test(part)) {
      // Extrait le texte du H2
      const h2Text = part.replace(/<[^>]+>/g, "");
      if (normalize(h2Text).includes(normalizedTitle.substring(0, 20))) {
        // Retourne ce H2 + le contenu suivant (jusqu'au prochain H2)
        const content = parts[i + 1] && !/<h2/i.test(parts[i + 1]) ? parts[i + 1] : "";
        return part + content;
      }
    }
  }

  return "";
}

/**
 * Génère l'article complet d'un guide (distribution mots-clés → fiches → assemblage).
 * Status: distributing → generating → complete (ou error)
 */
export async function generateArticle(guideId: string): Promise<void> {
  try {
    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      include: {
        products: { orderBy: { position: "asc" }, include: { intelligence: true } },
        keywords: true,
        media: true,
      },
    });

    if (!guide) throw new Error("Guide introuvable");
    if (!guide.planHtml) throw new Error("Le plan doit être généré avant l'article");

    const model = await getConfigModel("generation");
    let totalCost = guide.totalCost;

    // --- DISTRIBUTION MOTS-CLÉS ---
    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "distributing", currentStep: 0 },
    });

    const keywordSpecs = guide.keywords.map((k) => ({
      keyword: k.keyword,
      minOccurrences: k.minOccurrences,
      maxOccurrences: k.maxOccurrences,
    }));

    const allocations = distributeKeywords(keywordSpecs, guide.products.length);

    for (let i = 0; i < guide.products.length; i++) {
      await prisma.guideProduct.update({
        where: { id: guide.products[i].id },
        data: { keywordAllocation: JSON.stringify(allocations[i].keywords) },
      });
    }

    // --- GÉNÉRATION FICHES ---
    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "generating", currentStep: 0 },
    });

    const readyProducts = await prisma.guideProduct.findMany({
      where: { guideId },
      orderBy: { position: "asc" },
      include: { intelligence: true },
    });

    const htmlParts: string[] = [];

    for (let i = 0; i < readyProducts.length; i++) {
      await prisma.guide.update({
        where: { id: guideId },
        data: { currentStep: i + 1 },
      });

      const rp = readyProducts[i];
      const allocation = JSON.parse(rp.keywordAllocation) as { keyword: string; targetCount: number }[];

      const primaryKeyword =
        allocation.length > 0
          ? [...allocation].sort((a, b) => b.targetCount - a.targetCount)[0].keyword
          : guide.title;

      const planSection = extractPlanSection(guide.planHtml, rp.intelligence.productTitle);

      const prompt = buildGenerationPrompt(
        guide.media,
        rp.intelligence,
        primaryKeyword,
        guide.media.defaultProductWordCount,
        allocation,
        planSection || undefined
      );

      const { stream, getUsage } = await generateStream(prompt, model);

      let fullContent = "";
      for await (const text of stream) {
        fullContent += text;
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

      htmlParts.push(cleaned);
    }

    // --- RÉSUMÉ ---
    const bodyHtml = htmlParts.join("\n\n");

    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "summarizing", currentStep: 0 },
    });

    const { summary, cost: summaryCost } = await generateSummary(bodyHtml, model);
    totalCost += summaryCost;

    await prisma.guide.update({
      where: { id: guideId },
      data: { articleSummary: summary },
    });

    // --- ENRICHISSEMENTS (4 appels parallèles) ---
    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "enriching", currentStep: 0 },
    });

    const { totalCost: enrichCost } = await generateEnrichments(
      guideId, summary, guide.media, guide.title, model
    );
    totalCost += enrichCost;

    // --- ASSEMBLAGE FINAL ---
    const enriched = await prisma.guide.findUnique({
      where: { id: guideId },
      select: { chapoHtml: true, sommaireHtml: true, faqHtml: true },
    });

    const guideHtml = [
      enriched?.chapoHtml,
      enriched?.sommaireHtml,
      bodyHtml,
      enriched?.faqHtml,
    ].filter(Boolean).join("\n\n");

    const guideWordCount = countWords(guideHtml);

    await prisma.guide.update({
      where: { id: guideId },
      data: {
        guideHtml,
        guideWordCount,
        status: "complete",
        currentStep: 0,
        totalCost,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("Erreur article-generator:", err);
    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "error", errorMessage: message },
    });
  }
}
