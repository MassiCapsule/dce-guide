import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai-client";

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json();

    if (!prompt || !model) {
      return NextResponse.json(
        { error: "prompt et model sont requis" },
        { status: 400 }
      );
    }

    const result = await chatCompletion(model, [
      { role: "system", content: prompt },
      { role: "user", content: "Génère le plan du guide d'achat." },
    ], {
      temperature: 0.7,
      maxTokens: 8192,
    });

    // Clean markdown fences
    const html = result.content.replace(/^```html\s*/i, "").replace(/\s*```$/, "").trim();

    return NextResponse.json({
      html,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    });
  } catch (error) {
    console.error("Erreur generate-plan:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du plan" },
      { status: 500 }
    );
  }
}
