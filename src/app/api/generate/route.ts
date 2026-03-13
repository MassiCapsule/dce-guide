import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildGenerationPrompt } from "@/lib/prompt-builder";
import { generateStream } from "@/lib/generator";
import { cleanHtml, countWords } from "@/lib/generator/html-formatter";
import { getConfigModel } from "@/lib/config";
import { calculateCost } from "@/lib/pricing";

export async function POST(req: Request) {
  try {
    const { intelligenceId, mediaId, keyword, wordCount } = await req.json();

    if (!intelligenceId || !mediaId || !keyword) {
      return NextResponse.json(
        { error: "intelligenceId, mediaId et keyword sont requis" },
        { status: 400 }
      );
    }

    const [media, intelligence] = await Promise.all([
      prisma.media.findUnique({ where: { id: mediaId } }),
      prisma.productIntelligence.findUnique({ where: { id: intelligenceId } }),
    ]);

    if (!media) {
      return NextResponse.json(
        { error: "Media introuvable" },
        { status: 404 }
      );
    }

    if (!intelligence) {
      return NextResponse.json(
        { error: "ProductIntelligence introuvable" },
        { status: 404 }
      );
    }

    if (!intelligence.analyzed) {
      return NextResponse.json(
        { error: "L'intelligence produit n'a pas encore ete analysee" },
        { status: 400 }
      );
    }

    const targetWordCount = wordCount || media.defaultProductWordCount;
    const prompt = buildGenerationPrompt(media, intelligence, keyword, targetWordCount);
    const model = await getConfigModel();

    const { stream: openaiStream, getUsage } = await generateStream(prompt, model);

    let fullContent = "";

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        for await (const chunk of openaiStream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            fullContent += text;
            await writer.write(encoder.encode(text));
          }
        }

        const usage = getUsage();
        const promptTokens = usage?.promptTokens || 0;
        const completionTokens = usage?.completionTokens || 0;
        const cost = calculateCost(model, promptTokens, completionTokens);

        const cleaned = cleanHtml(fullContent);
        const actualWordCount = countWords(cleaned);

        await prisma.generatedProductCard.create({
          data: {
            asin: intelligence.asin,
            keyword,
            wordCount: actualWordCount,
            contentHtml: cleaned,
            promptUsed: prompt,
            modelUsed: model,
            tokensUsed: promptTokens + completionTokens,
            promptTokens,
            completionTokens,
            generationCost: cost,
            mediaId: media.id,
            intelligenceId: intelligence.id,
          },
        });
      } catch (err) {
        console.error("Erreur pendant la generation streaming:", err);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Erreur lors de la generation" },
      { status: 500 }
    );
  }
}
