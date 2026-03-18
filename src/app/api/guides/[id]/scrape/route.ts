import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeScrapeAndAnalyze } from "@/lib/guide/scrape-step";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET — statut du scraping + produits
export async function GET(_req: Request, { params }: RouteParams) {
  const { id: guideId } = await params;

  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    include: {
      products: {
        orderBy: { position: "asc" },
        include: { intelligence: true },
      },
    },
  });

  if (!guide) {
    return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    status: guide.status,
    currentStep: guide.currentStep,
    errorMessage: guide.errorMessage,
    products: guide.products.map((p) => ({
      id: p.id,
      position: p.position,
      asin: p.intelligence.asin,
      analyzed: p.intelligence.analyzed,
      productTitle: p.intelligence.productTitle,
    })),
  });
}

// POST — lancer le scraping en arrière-plan
export async function POST(_req: Request, { params }: RouteParams) {
  const { id: guideId } = await params;

  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    include: { products: true },
  });

  if (!guide) {
    return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
  }

  if (guide.products.length === 0) {
    return NextResponse.json({ error: "Aucun produit à scraper" }, { status: 400 });
  }

  // Lancer en arrière-plan sans await
  executeScrapeAndAnalyze(guideId).catch(console.error);

  return NextResponse.json({ started: true });
}
