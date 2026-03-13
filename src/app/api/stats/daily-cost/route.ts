import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cards = await prisma.generatedProductCard.findMany({
    where: { createdAt: { gte: today } },
    select: { generationCost: true, intelligenceId: true },
  });

  const intelligenceIds = Array.from(new Set(cards.map((c) => c.intelligenceId)));
  const intelligences = await prisma.productIntelligence.findMany({
    where: { id: { in: intelligenceIds } },
    select: { analysisCost: true, scrapingCost: true },
  });

  const generationCost = cards.reduce((sum, c) => sum + c.generationCost, 0);
  const analysisCost = intelligences.reduce((sum, i) => sum + i.analysisCost, 0);
  const scrapingCost = intelligences.reduce((sum, i) => sum + i.scrapingCost, 0);

  return NextResponse.json({
    cardCount: cards.length,
    generationCost,
    analysisCost,
    scrapingCost,
    totalCost: generationCost + analysisCost + scrapingCost,
  });
}
