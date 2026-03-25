import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HUMANISER_PROMPT } from "@/app/api/config/prompts/route";

export async function POST(req: NextRequest) {
  try {
    const { htmlV1, mediaId } = await req.json();

    if (!htmlV1 || !mediaId) {
      return NextResponse.json(
        { error: "htmlV1 et mediaId sont requis" },
        { status: 400 }
      );
    }

    // Load media and prompt config in parallel
    const [media, promptConfig] = await Promise.all([
      prisma.media.findUnique({ where: { id: mediaId } }),
      prisma.appConfig.findUnique({ where: { key: "prompt_humaniser" } }),
    ]);

    if (!media) {
      return NextResponse.json(
        { error: "Media introuvable" },
        { status: 404 }
      );
    }

    // Use DB prompt if available, otherwise fall back to default
    let prompt = promptConfig?.value || HUMANISER_PROMPT;

    // Replace media placeholders
    prompt = prompt.replace(/\{media\.toneDescription\}/g, media.toneDescription || "");
    prompt = prompt.replace(/\{media\.writingStyle\}/g, media.writingStyle || "");

    // Replace forbidden words (from AppConfig)
    const bullet = (s: string) => s.startsWith("- ") ? s : `- ${s}`;
    const fwRow = await prisma.appConfig.findUnique({ where: { key: "forbidden_words" } });
    let forbiddenWords: string[] = [];
    if (fwRow?.value) {
      try { forbiddenWords = JSON.parse(fwRow.value); } catch { forbiddenWords = []; }
    }
    prompt = prompt.replace(/\{forbiddenWords\}/g, forbiddenWords.length > 0 ? forbiddenWords.map(bullet).join("\n") : "(aucun)");

    // Replace the HTML V1 placeholder
    prompt = prompt.replace(/\{\{fiche_produit_v1\}\}/g, htmlV1);

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error("Erreur build-humanize-prompt:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { error: `Erreur lors de la construction du prompt : ${message}` },
      { status: 500 }
    );
  }
}
