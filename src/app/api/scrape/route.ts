import { NextResponse } from "next/server";
import { scrapeAndStore } from "@/lib/scraper";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { asin, forceRefresh } = await req.json();

    if (!asin || typeof asin !== "string") {
      return NextResponse.json(
        { error: "ASIN requis" },
        { status: 400 }
      );
    }

    if (!forceRefresh) {
      const existing = await prisma.productIntelligence.findUnique({
        where: { asin_marketplace: { asin, marketplace: "amazon.fr" } },
      });

      if (existing) {
        return NextResponse.json(existing);
      }
    }

    const intelligence = await scrapeAndStore(asin, forceRefresh);
    return NextResponse.json(intelligence);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Erreur lors du scraping" },
      { status: 500 }
    );
  }
}
