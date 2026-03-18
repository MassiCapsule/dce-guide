import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 600; // 10 minutes max

const SERPMANTICS_HOST = "https://app.serpmantics.com";
const POLL_INTERVAL_MS = 5_000;  // toutes les 5s
const MAX_TOTAL_MS = 600_000;    // arreter apres 10 min au total

export async function POST(req: NextRequest) {
  const dbConfig = await prisma.appConfig.findFirst({ where: { key: "serpmantics_api_key" } });
  const apiKey = dbConfig?.value || process.env.SERPMANTICS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SERPMANTICS_API_KEY non configuree" },
      { status: 500 }
    );
  }

  const { keyword, mediaName } = await req.json();
  if (!keyword?.trim()) {
    return NextResponse.json(
      { error: "Mot-cle requis" },
      { status: 400 }
    );
  }

  // Step 1: Create guide
  const group = mediaName ? `DCE-${mediaName}-API` : "DCE-API";
  const createRes = await fetch(`${SERPMANTICS_HOST}/api/v1/guides`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ queries: [keyword.trim()], lang: "fr", group }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    return NextResponse.json(
      { error: `Erreur creation guide Serpmantics: ${text}` },
      { status: createRes.status }
    );
  }

  const createData = await createRes.json();
  const guideId = createData.guides?.[0]?.id;
  if (!guideId) {
    return NextResponse.json(
      { error: "ID guide non recu" },
      { status: 500 }
    );
  }

  // Step 2: Sonder toutes les 5s jusqu'a 10 min au total
  const deadline = Date.now() + MAX_TOTAL_MS;
  let guide = null;

  while (Date.now() < deadline) {
    const pollRes = await fetch(
      `${SERPMANTICS_HOST}/api/v1/guide?id=${guideId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (pollRes.status === 202) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }
    if (!pollRes.ok) {
      const text = await pollRes.text();
      return NextResponse.json(
        { error: `Erreur polling Serpmantics: ${text}` },
        { status: pollRes.status }
      );
    }

    guide = await pollRes.json();
    break;
  }

  if (!guide) {
    return NextResponse.json(
      { error: "Timeout: le guide Serpmantics n'est pas pret apres 10 minutes" },
      { status: 504 }
    );
  }

  // Step 3: Extract keywords + word count (sorted by importance: highest target first)
  const addList = guide.guide?.guide?.add ?? [];
  const keywords = addList
    .map((item: { expression: string; from: number; to: number }) => ({
      keyword: item.expression,
      min: item.from,
      max: item.to,
    }))
    .sort((a: { max: number }, b: { max: number }) => b.max - a.max);

  const wordCountMin = guide.guide?.guide?.structure?.length?.from ?? 0;
  const wordCountMax = guide.guide?.guide?.structure?.length?.to ?? 0;

  return NextResponse.json({ keywords, wordCountMin, wordCountMax, serpanticsGuideId: guideId });
}
