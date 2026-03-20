import { prisma } from "@/lib/prisma";
import { generateStream } from "@/lib/generator";
import { cleanHtml, countWords } from "@/lib/generator/html-formatter";
import { distributeKeywords } from "@/lib/keywords/distributor";
import { getConfigModel } from "@/lib/config";
import { calculateCost } from "@/lib/pricing";
import { generateSummary, generateEnrichments, loadPrompt } from "./enrichment-step";
import type { Media, ProductIntelligence } from "@prisma/client";

/**
 * Extrait la section HTML du plan correspondant à un produit donné.
 * Cherche le H2 contenant le nom du produit et retourne tout jusqu'au H2 suivant.
 */
/**
 * Convertit du HTML en texte lisible, en préservant la structure.
 * Les H2 deviennent "## Titre", les H3 "### Titre", les <li> "- item", etc.
 */
export function htmlToReadableText(html: string): string {
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Vérifie si un titre produit (Amazon, souvent anglais) correspond à un titre de section du plan (français).
 * Compare la marque et les mots significatifs.
 */
function titlesMatch(planTitle: string, productTitle: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\sàâäéèêëïîôùûüç&]/g, " ").replace(/\s+/g, " ").trim();
  const planNorm = normalize(planTitle);
  const productNorm = normalize(productTitle);

  // Match direct (20 premiers caractères)
  if (planNorm.includes(productNorm.substring(0, 20))) return true;
  if (productNorm.includes(planNorm.substring(0, 20))) return true;

  // Extraire les mots significatifs (> 2 chars) de chaque titre
  const planWords = planNorm.split(" ").filter((w) => w.length > 2);
  const productWords = productNorm.split(" ").filter((w) => w.length > 2);

  // Compter les mots en commun
  const commonWords = planWords.filter((w) => productWords.some((pw) => pw === w || pw.includes(w) || w.includes(pw)));

  // Au moins 1 mot significatif en commun pour les noms de marque (> 5 chars)
  const longCommon = planWords.filter((w) => w.length > 5 && productWords.some((pw) => pw === w || pw.includes(w) || w.includes(pw)));
  if (longCommon.length >= 1) return true;

  // Sinon au moins 2 mots en commun
  return commonWords.length >= 2;
}

export function extractPlanSection(planHtml: string, productTitle: string): string {
  if (!planHtml || !productTitle) return "";

  // Chercher dans H3 (format principal) puis H2 (fallback)
  for (const tagLevel of ["h3", "h2"] as const) {
    const regex = new RegExp(`(<${tagLevel}[\\s\\S]*?<\\/${tagLevel}>)`, "gi");
    const parts = planHtml.split(regex).filter(Boolean);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (new RegExp(`<${tagLevel}`, "i").test(part)) {
        const headingText = part.replace(/<[^>]+>/g, "");
        if (titlesMatch(headingText, productTitle)) {
          // Capturer le heading + TOUT le contenu jusqu'au prochain heading de même niveau
          let content = part;
          for (let j = i + 1; j < parts.length; j++) {
            if (new RegExp(`<${tagLevel}`, "i").test(parts[j])) break;
            content += parts[j];
          }
          // Convertir les H4 en H2 (titres à reproduire)
          content = content.replace(/<h4([^>]*)>/gi, "<h2$1>").replace(/<\/h4>/gi, "</h2>");
          return htmlToReadableText(content);
        }
      }
    }
  }

  return "";
}

/**
 * Résout le template de génération (depuis Paramètres) avec les données produit.
 */
export function resolveGenerationTemplate(
  template: string,
  media: Media,
  intelligence: ProductIntelligence,
  keyword: string,
  wordCount: number,
  keywordAllocation: { keyword: string; targetCount: number }[],
  planSection: string
): string {
  const bullet = (s: string) => (s.startsWith("- ") ? s : `- ${s}`);

  const parseJson = (s: string): string[] => {
    try { return JSON.parse(s); } catch { return []; }
  };

  const doRules = parseJson(media.doRules);
  const dontRules = parseJson(media.dontRules);
  const forbiddenWords = parseJson(media.forbiddenWords);

  const keywordsFormatted = keywordAllocation.length > 0
    ? keywordAllocation.map((k) => `- "${k.keyword}" : ${k.targetCount} occurrence${k.targetCount > 1 ? "s" : ""}`).join("\n")
    : keyword;

  return template
    .replace(/\{media\.name\}/g, media.name || "")
    .replace(/\{media\.toneDescription\}/g, media.toneDescription || "")
    .replace(/\{media\.writingStyle\}/g, media.writingStyle || "")
    .replace(/\{media\.productStructureTemplate\}/g, media.productStructureTemplate || "")
    .replace(/\{doRules\}/g, doRules.map(bullet).join("\n"))
    .replace(/\{dontRules\}/g, dontRules.map(bullet).join("\n"))
    .replace(/\{forbiddenWords\}/g, forbiddenWords.map(bullet).join("\n"))
    .replace(/\{intelligence\.productTitle\}/g, intelligence.productTitle || "")
    .replace(/\{intelligence\.shortTitle\}/g, intelligence.shortTitle || "")
    .replace(/\{intelligence\.productBrand\}/g, intelligence.productBrand || "")
    .replace(/\{intelligence\.productPrice\}/g, intelligence.productPrice || "")
    .replace(/\{intelligence\.asin\}/g, intelligence.asin || "")
    .replace(/\{intelligence\.positioningSummary\}/g, intelligence.positioningSummary || "")
    .replace(/\{intelligence\.keyFeatures\}/g, parseJson(intelligence.keyFeatures).map(bullet).join("\n"))
    .replace(/\{intelligence\.detectedUsages\}/g, parseJson(intelligence.detectedUsages).map(bullet).join("\n"))
    .replace(/\{intelligence\.buyerProfiles\}/g, parseJson(intelligence.buyerProfiles).map(bullet).join("\n"))
    .replace(/\{intelligence\.strengthPoints\}/g, parseJson(intelligence.strengthPoints).map(bullet).join("\n"))
    .replace(/\{intelligence\.weaknessPoints\}/g, parseJson(intelligence.weaknessPoints).map(bullet).join("\n"))
    .replace(/\{intelligence\.recurringProblems\}/g, parseJson(intelligence.recurringProblems).map(bullet).join("\n"))
    .replace(/\{intelligence\.remarkableQuotes\}/g, parseJson(intelligence.remarkableQuotes).map((q) => `> "${q}"`).join("\n"))
    .replace(/\{keyword\}/g, keyword)
    .replace(/\{keywords\}/g, keywordsFormatted)
    .replace(/\{wordCount\}/g, String(wordCount))
    .replace(/\{planSection\}/g, planSection);
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

    // --- DISTRIBUTION MOTS-CLÉS (désactivée — mots-clés gérés par le plan) ---
    // await prisma.guide.update({
    //   where: { id: guideId },
    //   data: { status: "distributing", currentStep: 0 },
    // });
    //
    // const keywordSpecs = guide.keywords.map((k) => ({
    //   keyword: k.keyword,
    //   minOccurrences: k.minOccurrences,
    //   maxOccurrences: k.maxOccurrences,
    // }));
    //
    // const allocations = distributeKeywords(keywordSpecs, guide.products.length);
    //
    // for (let i = 0; i < guide.products.length; i++) {
    //   await prisma.guideProduct.update({
    //     where: { id: guide.products[i].id },
    //     data: { keywordAllocation: JSON.stringify(allocations[i].keywords) },
    //   });
    // }

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

    // Charger le template de génération depuis Paramètres
    const generationTemplate = await loadPrompt("prompt_generation");

    for (let i = 0; i < readyProducts.length; i++) {
      await prisma.guide.update({
        where: { id: guideId },
        data: { currentStep: i + 1 },
      });

      const rp = readyProducts[i];

      const primaryKeyword = guide.title;

      const planSection = extractPlanSection(guide.planHtml, rp.intelligence.productTitle);

      const prompt = resolveGenerationTemplate(
        generationTemplate,
        guide.media,
        rp.intelligence,
        primaryKeyword,
        guide.media.defaultProductWordCount,
        [],
        planSection
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
      guideId, summary, guide.media, guide.title, model, guide.planHtml
    );
    totalCost += enrichCost;

    // --- ASSEMBLAGE FINAL ---
    const enriched = await prisma.guide.findUnique({
      where: { id: guideId },
      select: { chapoHtml: true, sommaireHtml: true, faqHtml: true },
    });

    // Extraire le H1 du plan (premier <h1> trouvé), sinon fallback sur guide.title
    const h1Match = guide.planHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const h1Title = h1Match ? h1Match[0] : `<h1>${guide.title}</h1>`;

    const guideHtml = [
      h1Title,
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
