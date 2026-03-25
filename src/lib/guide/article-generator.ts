import { prisma } from "@/lib/prisma";
import { generateStream } from "@/lib/generator";
import { cleanHtml, countWords } from "@/lib/generator/html-formatter";
import { distributeKeywords } from "@/lib/keywords/distributor";
import { getConfigModel } from "@/lib/config";
import { calculateCost } from "@/lib/pricing";
import { generateSummary, generateEnrichments, loadPrompt, loadForbiddenWords, formatForbiddenWords, stripBoldFromBody, fixCapitalization } from "./enrichment-step";
import { parsePlanJson } from "./plan-types";
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
 * Extrait la section du plan pour un produit via son ASIN (match exact depuis planJson).
 */
export function extractPlanSectionFromJson(
  planJsonStr: string | null | undefined,
  asin: string
): string {
  const plan = parsePlanJson(planJsonStr);
  if (!plan) return "";

  const product = plan.produits.find((p) => p.asin === asin);
  if (!product) {
    console.warn(`Produit ASIN ${asin} non trouvé dans planJson`);
    return "";
  }

  let text = `## ${product["Titre H2"]} (H2)\n`;
  if (product.Brief) {
    text += `Brief : ${product.Brief}\n`;
  }
  text += "\n";

  text += `PARTIE 1 – Situation (sans titre visible)\n`;
  text += `Brief : ${product.parties.situation.brief}\n\n`;

  if (product.parties.atouts.h2) {
    text += `### ${product.parties.atouts.h2} (H3)\n`;
  }
  text += `Brief : ${product.parties.atouts.brief}\n`;
  if (product.parties.atouts.points?.length) {
    text += `Points : ${product.parties.atouts.points.join(", ")}\n`;
  }
  text += "\n";

  if (product.parties.valeur.h2) {
    text += `### ${product.parties.valeur.h2} (H3)\n`;
  }
  text += `Brief : ${product.parties.valeur.brief}\n\n`;

  if (product.parties.evidence.h2) {
    text += `### ${product.parties.evidence.h2} (H3)\n`;
  }
  text += `Brief : ${product.parties.evidence.brief}\n\n`;

  if (product.mots_cles?.length) {
    text += `Mots-clés secondaires : ${product.mots_cles.join(", ")}\n`;
  }
  text += `Nombre de mots : ${product.mots_total}\n`;
  text += `Prix : ${product.prix}\n`;
  text += `URL marchand : ${product.url}\n`;

  return text.trim();
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
  planSection: string,
  forbiddenFormatted: string = "(aucun)"
): string {
  const bullet = (s: string) => (s.startsWith("- ") ? s : `- ${s}`);

  const parseJson = (s: string): string[] => {
    try { return JSON.parse(s); } catch { return []; }
  };

  const doRules = parseJson(media.doRules);
  const dontRules = parseJson(media.dontRules);

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
    .replace(/\{forbiddenWords\}/g, forbiddenFormatted)
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

    // Charger le template de génération + mots interdits depuis Paramètres
    const [generationTemplate, forbiddenWords] = await Promise.all([
      loadPrompt("prompt_generation"),
      loadForbiddenWords(),
    ]);
    const forbiddenFormatted = formatForbiddenWords(forbiddenWords);

    for (let i = 0; i < readyProducts.length; i++) {
      await prisma.guide.update({
        where: { id: guideId },
        data: { currentStep: i + 1 },
      });

      const rp = readyProducts[i];

      const primaryKeyword = guide.title;

      const planSection = extractPlanSectionFromJson(
        guide.planJson,
        rp.intelligence.asin
      );

      // Nombre de mots : depuis le plan JSON (mots_total), fallback 800
      const planData = parsePlanJson(guide.planJson);
      const planProduct = planData?.produits.find((p) => p.asin === rp.intelligence.asin);
      const targetWordCount = planProduct?.mots_total || 250;

      const prompt = resolveGenerationTemplate(
        generationTemplate,
        guide.media,
        rp.intelligence,
        primaryKeyword,
        targetWordCount,
        [],
        planSection,
        forbiddenFormatted
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

      // Injecter l'image produit après le premier H2
      const imageUrl = rp.intelligence.productImageUrl;
      const withImage = imageUrl
        ? cleaned.replace(
            /(<h2[^>]*>[\s\S]*?<\/h2>)/i,
            `$1\n<img src="${imageUrl}" alt="${rp.intelligence.shortTitle || rp.intelligence.productTitle}" />`
          )
        : cleaned;
      htmlParts.push(withImage);
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
      guideId, summary, guide.media, guide.title, model, guide.planJson
    );
    totalCost += enrichCost;

    // --- ASSEMBLAGE FINAL ---
    const enriched = await prisma.guide.findUnique({
      where: { id: guideId },
      select: { chapoHtml: true, sommaireHtml: true, criteresHtml: true, faqHtml: true },
    });

    // Extraire le H1 : JSON d'abord, sinon HTML, sinon guide.title
    const planData = parsePlanJson(guide.planJson);
    const h1Title = planData?.H1?.titre
      ? `<h1>${planData.H1.titre}</h1>`
      : (guide.planHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[0] || `<h1>${guide.title}</h1>`);

    const guideHtmlRaw = [
      h1Title,
      enriched?.chapoHtml,
      enriched?.sommaireHtml,
      enriched?.criteresHtml,
      bodyHtml,
      enriched?.faqHtml,
    ].filter(Boolean).join("\n\n");

    // Pas de post-traitements sur V1 (appliqués uniquement sur V2)
    const guideHtml = guideHtmlRaw;

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
