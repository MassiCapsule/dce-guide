import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SERPMANTICS_HOST = "https://app.serpmantics.com";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { content } = await req.json();

  if (!content) {
    return NextResponse.json({ error: "content requis" }, { status: 400 });
  }

  const guide = await prisma.guide.findUnique({
    where: { id },
    include: { keywords: { orderBy: { id: "asc" } } },
  });

  if (!guide) {
    return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
  }

  if (!guide.serpanticsGuideId) {
    return NextResponse.json({ error: "Aucun guide Serpmantics associé" }, { status: 400 });
  }

  const dbConfig = await prisma.appConfig.findFirst({ where: { key: "serpmantics_api_key" } });
  const apiKey = dbConfig?.value || process.env.SERPMANTICS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "SERPMANTICS_API_KEY non configurée" }, { status: 500 });
  }

  const scoreRes = await fetch(`${SERPMANTICS_HOST}/api/v1/score`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      guideId: guide.serpanticsGuideId,
      content,
      saveToGuide: true,
    }),
  });

  if (!scoreRes.ok) {
    const text = await scoreRes.text();
    return NextResponse.json(
      { error: `Erreur Serpmantics: ${text}` },
      { status: scoreRes.status }
    );
  }

  const scoreData = await scoreRes.json();
  const expressions: Record<string, number> = scoreData.contentAnalysis?.expressions ?? {};
  const score: number | null = scoreData.contentAnalysis?.score ?? null;

  // Fusionner avec les mots-clés du guide pour calculer ok/not ok
  const keywords = guide.keywords.map((kw) => {
    const current = expressions[kw.keyword] ?? 0;
    return {
      expression: kw.keyword,
      target: kw.maxOccurrences,
      current,
      ok: current >= kw.minOccurrences && current <= kw.maxOccurrences,
    };
  });

  return NextResponse.json({ score, keywords });
}
