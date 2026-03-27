import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";
import { getConfigModel } from "@/lib/config";
import { loadPrompt } from "@/lib/guide/enrichment-step";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const { id: guideId } = await params;

    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
    });

    if (!guide) {
      return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
    }

    const promptTemplate = await loadPrompt("prompt_criteres_auto");
    const prompt = promptTemplate.replace(/\{keyword\}/g, guide.title);

    const model = await getConfigModel("generation");
    const result = await chatCompletion(model, [
      { role: "user", content: prompt },
    ], { temperature: 0.7, maxTokens: 1024 });

    // Parser le JSON retourné par l'IA
    const raw = result.content.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Réponse IA invalide (pas de JSON)" }, { status: 500 });
    }

    const criteres = JSON.parse(jsonMatch[0]) as { critere: string; explication: string }[];

    // Formater en texte pour le champ criteria
    const criteriaText = criteres
      .map((c, i) => `${i + 1}. **${c.critere}** : ${c.explication}`)
      .join("\n");

    // Sauvegarder sur le guide
    await prisma.guide.update({
      where: { id: guideId },
      data: { criteria: criteriaText },
    });

    return NextResponse.json({ criteria: criteriaText, criteres });
  } catch (error) {
    console.error("Erreur criteres-auto:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
