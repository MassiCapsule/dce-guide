import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";
import { getConfigModel } from "@/lib/config";
import { calculateCost } from "@/lib/pricing";
import { HUMANISER_PROMPT } from "@/app/api/config/prompts/route";

/**
 * Humanise l'article V1 d'un guide pour produire la version V2.
 * Status: humanizing → complete (ou error)
 */
export async function humanizeArticle(guideId: string): Promise<void> {
  try {
    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      include: { media: true },
    });

    if (!guide) throw new Error("Guide introuvable");
    if (!guide.guideHtml) throw new Error("L'article V1 doit être généré avant l'humanisation");

    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "humanizing", currentStep: 0, errorMessage: "" },
    });

    // Charger le prompt humaniser depuis AppConfig
    const promptConfig = await prisma.appConfig.findUnique({
      where: { key: "prompt_humaniser" },
    });
    let prompt = promptConfig?.value || HUMANISER_PROMPT;

    // Résoudre les placeholders média
    const media = guide.media;
    prompt = prompt.replace(/\{media\.toneDescription\}/g, media.toneDescription || "");
    prompt = prompt.replace(/\{media\.writingStyle\}/g, media.writingStyle || "");

    // Mots interdits
    let forbiddenWords: string[] = [];
    try { forbiddenWords = JSON.parse(media.forbiddenWords); } catch { forbiddenWords = []; }
    const bullet = (s: string) => s.startsWith("- ") ? s : `- ${s}`;
    prompt = prompt.replace(/\{forbiddenWords\}/g, forbiddenWords.map(bullet).join("\n"));

    // Injecter l'article V1
    prompt = prompt.replace(/\{\{fiche_produit_v1\}\}/g, guide.guideHtml);

    // Appel IA
    const model = await getConfigModel("generation");
    const result = await chatCompletion(model, [
      { role: "system", content: prompt },
      { role: "user", content: "Réécris l'article complet en suivant les instructions ci-dessus. Conserve la structure HTML et les balises." },
    ], { temperature: 0.7, maxTokens: 16384 });

    // Nettoyage markdown
    let htmlV2 = result.content;
    htmlV2 = htmlV2.replace(/^```html\s*/i, "").replace(/```\s*$/, "").trim();

    const cost = calculateCost(model, result.promptTokens, result.completionTokens);

    await prisma.guide.update({
      where: { id: guideId },
      data: {
        guideHtmlV2: htmlV2,
        status: "complete",
        currentStep: 0,
        totalCost: { increment: cost },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("Erreur humanize-step:", err);
    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "error", errorMessage: message },
    });
  }
}
