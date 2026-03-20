import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const guides = await prisma.guide.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      media: { select: { name: true } },
      products: {
        orderBy: { position: "asc" },
        include: { intelligence: { select: { id: true, productTitle: true } } },
      },
      _count: { select: { products: true, keywords: true } },
    },
  });

  return NextResponse.json(guides);
}

export async function POST(req: Request) {
  try {
    const { title, mediaId, keywords, criteria, wordCountMin, wordCountMax, serpanticsGuideId } = await req.json();

    if (!title || !mediaId || !keywords?.length) {
      return NextResponse.json(
        { error: "title, mediaId et keywords sont requis" },
        { status: 400 }
      );
    }

    const guide = await prisma.guide.create({
      data: {
        title,
        mediaId,
        criteria: criteria ?? "",
        wordCountMin: wordCountMin ?? 0,
        wordCountMax: wordCountMax ?? 0,
        serpanticsGuideId: serpanticsGuideId ?? "",
        keywords: {
          create: keywords.map((k: any) => ({
            keyword: k.keyword,
            minOccurrences: k.min,
            maxOccurrences: k.max,
          })),
        },
      },
      include: {
        keywords: true,
        media: true,
      },
    });

    return NextResponse.json(guide);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Erreur lors de la creation du guide" },
      { status: 500 }
    );
  }
}
