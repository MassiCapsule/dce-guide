import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const guides = await prisma.guide.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      media: { select: { name: true } },
      _count: { select: { products: true, keywords: true } },
    },
  });

  return NextResponse.json(guides);
}

export async function POST(req: Request) {
  try {
    const { title, mediaId, products, keywords } = await req.json();

    if (!title || !mediaId || !products?.length || !keywords?.length) {
      return NextResponse.json(
        { error: "title, mediaId, products et keywords sont requis" },
        { status: 400 }
      );
    }

    if (products.length < 2 || products.length > 10) {
      return NextResponse.json(
        { error: "Un guide doit contenir entre 2 et 10 produits" },
        { status: 400 }
      );
    }

    // For each ASIN, find or create a ProductIntelligence placeholder
    const productLinks: { intelligenceId: string; position: number }[] = [];

    for (let i = 0; i < products.length; i++) {
      const asin = products[i].asin?.trim();
      if (!asin) {
        return NextResponse.json(
          { error: `EAN manquant pour le produit ${i + 1}` },
          { status: 400 }
        );
      }

      // Find existing or create placeholder
      let intelligence = await prisma.productIntelligence.findUnique({
        where: { asin_marketplace: { asin, marketplace: "amazon.fr" } },
      });

      if (!intelligence) {
        intelligence = await prisma.productIntelligence.create({
          data: { asin, marketplace: "amazon.fr" },
        });
      }

      productLinks.push({ intelligenceId: intelligence.id, position: i + 1 });
    }

    // Create the guide with products and keywords
    const guide = await prisma.guide.create({
      data: {
        title,
        mediaId,
        products: {
          create: productLinks.map((p) => ({
            position: p.position,
            intelligenceId: p.intelligenceId,
          })),
        },
        keywords: {
          create: keywords.map((k: any) => ({
            keyword: k.keyword,
            minOccurrences: k.min,
            maxOccurrences: k.max,
          })),
        },
      },
      include: {
        products: { include: { intelligence: true } },
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
