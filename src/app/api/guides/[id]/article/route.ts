import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateArticle } from "@/lib/guide/article-generator";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
  const { id: guideId } = await params;

  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    include: { products: true },
  });

  if (!guide) {
    return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
  }

  if (!guide.planHtml) {
    return NextResponse.json(
      { error: "Le plan doit être généré avant l'article" },
      { status: 400 }
    );
  }

  if (guide.products.length === 0) {
    return NextResponse.json({ error: "Aucun produit dans le guide" }, { status: 400 });
  }

  // Lancer en arrière-plan sans await
  generateArticle(guideId).catch(console.error);

  return NextResponse.json({ started: true });
}
