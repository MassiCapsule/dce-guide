import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfigModel } from "@/lib/config";
import { regenerateChapoAndFaq, stripBoldFromBody, fixCapitalization } from "@/lib/guide/enrichment-step";
import { parsePlanJson } from "@/lib/guide/plan-types";
import { countWords } from "@/lib/generator/html-formatter";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Ré-assemble l'article V1 depuis les parties en DB + les fiches produits.
 */
async function reassembleArticle(guideId: string): Promise<string> {
  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    select: {
      title: true,
      planHtml: true,
      planJson: true,
      chapoHtml: true,
      sommaireHtml: true,
      criteresHtml: true,
      faqHtml: true,
      products: {
        orderBy: { position: "asc" },
        include: { generatedCard: true, intelligence: true },
      },
    },
  });

  if (!guide) throw new Error("Guide introuvable");

  const planData = parsePlanJson(guide.planJson);
  const h1Title = planData?.H1?.titre
    ? `<h1>${planData.H1.titre}</h1>`
    : (guide.planHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[0] || `<h1>${guide.title}</h1>`);

  const bodyHtml = guide.products
    .map((p) => {
      const cardHtml = p.generatedCard?.contentHtml || "";
      if (!cardHtml) return "";
      const imageUrl = p.intelligence?.productImageUrl;
      if (!imageUrl) return cardHtml;
      return cardHtml.replace(
        /(<h2[^>]*>[\s\S]*?<\/h2>)/i,
        `$1\n<img src="${imageUrl}" alt="${p.intelligence?.shortTitle || p.intelligence?.productTitle || ""}" />`
      );
    })
    .filter(Boolean)
    .join("\n\n");

  const guideHtmlRaw = [
    h1Title,
    guide.chapoHtml,
    guide.sommaireHtml,
    guide.criteresHtml,
    bodyHtml,
    guide.faqHtml,
  ].filter(Boolean).join("\n\n");

  // Pas de post-traitements sur V1
  return guideHtmlRaw;
}

/**
 * Remplace le chapô+intro et la FAQ dans un HTML existant (pour V2).
 * - Chapô+intro = tout entre </h1> et le premier <h2>
 * - FAQ = tout depuis le dernier <h2> qui est suivi de <h3> jusqu'à la fin
 */
function replaceIntroAndFaqInHtml(
  existingHtml: string,
  newChapoHtml: string,
  newFaqHtml: string,
  keyword: string = ""
): string {
  let result = existingHtml;

  // Remplacer chapô+intro : tout entre </h1> et le premier <h2>
  result = result.replace(
    /(<\/h1>)([\s\S]*?)(<h2)/i,
    `$1\n\n${newChapoHtml}\n\n$3`
  );

  // Remplacer FAQ : trouver le dernier bloc <h2>...<h3>...</h3>...<p>... jusqu'à la fin
  // On cherche le dernier <h2> suivi de <h3> (pattern FAQ)
  const faqPattern = /(<h2[^>]*>[^<]*<\/h2>\s*(?:<h3[^>]*>[\s\S]*?)*)$/i;
  if (faqPattern.test(result)) {
    result = result.replace(faqPattern, newFaqHtml);
  }

  return fixCapitalization(stripBoldFromBody(result), keyword);
}

export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params;

  let target = "v1";
  try {
    const body = await req.json();
    if (body.target === "v2") target = "v2";
  } catch {
    // Pas de body = v1 par défaut
  }

  const guide = await prisma.guide.findUnique({
    where: { id },
    include: { media: true },
  });

  if (!guide) {
    return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
  }

  if (!guide.guideHtml) {
    return NextResponse.json({ error: "L'article doit être généré avant de relancer l'intro/FAQ" }, { status: 400 });
  }

  if (target === "v2" && !guide.guideHtmlV2) {
    return NextResponse.json({ error: "L'article V2 doit être généré avant de relancer l'intro/FAQ V2" }, { status: 400 });
  }

  if (!guide.articleSummary) {
    return NextResponse.json({ error: "Le résumé de l'article est manquant" }, { status: 400 });
  }

  // Lancer en arrière-plan
  (async () => {
    try {
      await prisma.guide.update({
        where: { id },
        data: { status: "enriching", currentStep: 0 },
      });

      const model = await getConfigModel("generation");

      const { totalCost } = await regenerateChapoAndFaq(
        id,
        guide.articleSummary,
        guide.media,
        guide.title,
        model,
        guide.planJson
      );

      if (target === "v2") {
        // V2 : remplacer intro + FAQ dans guideHtmlV2
        const updatedGuide = await prisma.guide.findUnique({
          where: { id },
          select: { chapoHtml: true, faqHtml: true, guideHtmlV2: true },
        });

        if (updatedGuide?.guideHtmlV2) {
          const newV2 = replaceIntroAndFaqInHtml(
            updatedGuide.guideHtmlV2,
            updatedGuide.chapoHtml || "",
            updatedGuide.faqHtml || "",
            guide.title
          );

          await prisma.guide.update({
            where: { id },
            data: {
              guideHtmlV2: newV2,
              status: "complete",
              currentStep: 0,
              totalCost: guide.totalCost + totalCost,
            },
          });
        }
      } else {
        // V1 : ré-assembler l'article complet
        const guideHtml = await reassembleArticle(id);
        const guideWordCount = countWords(guideHtml);

        await prisma.guide.update({
          where: { id },
          data: {
            guideHtml,
            guideWordCount,
            status: "complete",
            currentStep: 0,
            totalCost: guide.totalCost + totalCost,
          },
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("Erreur regenerate-intro-faq:", err);
      await prisma.guide.update({
        where: { id },
        data: { status: "error", errorMessage: message },
      });
    }
  })();

  return NextResponse.json({ ok: true });
}
