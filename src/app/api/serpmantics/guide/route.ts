import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SERPMANTICS_HOST = "https://app.serpmantics.com";
const MAX_POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 3000;

export async function POST(req: NextRequest) {
  const dbConfig = await prisma.appConfig.findFirst({ where: { key: "serpmantics_api_key" } });
  const apiKey = dbConfig?.value || process.env.SERPMANTICS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SERPMANTICS_API_KEY non configuree" },
      { status: 500 }
    );
  }

  const { keyword } = await req.json();
  if (!keyword?.trim()) {
    return NextResponse.json(
      { error: "Mot-cle requis" },
      { status: 400 }
    );
  }

  // Step 1: Create guide
  const createRes = await fetch(`${SERPMANTICS_HOST}/api/v1/guides`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ queries: [keyword.trim()], lang: "fr" }),
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

  // Step 2: Poll until ready
  let guide = null;
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(
      `${SERPMANTICS_HOST}/api/v1/guide?id=${guideId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (pollRes.status === 202) continue; // not ready yet
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
      { error: "Timeout: le guide Serpmantics n'est pas pret apres 45 secondes" },
      { status: 504 }
    );
  }

  // Step 3: Extract keywords
  const addList = guide.guide?.guide?.add ?? [];
  const keywords = addList.map((item: { expression: string; from: number; to: number }) => ({
    keyword: item.expression,
    min: item.from,
    max: item.to,
  }));

  return NextResponse.json({ keywords });
}
