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
      { role: "user", content: "Genere la fiche produit complete en suivant les instructions ci-dessus." },
    ], {
      temperature: 0.7,
      maxTokens: 4096,
    });

    return NextResponse.json({
      html: result.content,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    });
  } catch (error) {
    console.error("Erreur generate:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération" },
      { status: 500 }
    );
  }
}
