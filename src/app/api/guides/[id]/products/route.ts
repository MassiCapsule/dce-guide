import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const { id: guideId } = await params;
  const { asins } = await req.json() as { asins: string[] };

  if (!Array.isArray(asins) || asins.length === 0) {
    return NextResponse.json({ error: "asins requis" }, { status: 400 });
  }

  // Get current max position
  const existing = await prisma.guideProduct.findMany({
    where: { guideId },
    orderBy: { position: "desc" },
    take: 1,
  });
  let nextPosition = existing.length > 0 ? existing[0].position + 1 : 1;

  for (const rawAsin of asins) {
    const asin = rawAsin.trim().toUpperCase();
    if (!asin) continue;

    // Find or create a placeholder ProductIntelligence
    const intelligence = await prisma.productIntelligence.upsert({
      where: { asin_marketplace: { asin, marketplace: "amazon.fr" } },
      create: { asin, marketplace: "amazon.fr" },
      update: {},
    });

    // Create GuideProduct — ignore if already exists
    try {
      await prisma.guideProduct.create({
        data: { guideId, intelligenceId: intelligence.id, position: nextPosition },
      });
      nextPosition++;
    } catch {
      // Duplicate [guideId, intelligenceId] — skip silently
    }
  }

  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    include: {
      products: {
        orderBy: { position: "asc" },
        include: { intelligence: true, generatedCard: true },
      },
      keywords: true,
    },
  });

  return NextResponse.json(guide);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { id: guideId } = await params;
  const { productId } = await req.json() as { productId: string };

  await prisma.guideProduct.delete({ where: { id: productId, guideId } });

  return NextResponse.json({ ok: true });
}
