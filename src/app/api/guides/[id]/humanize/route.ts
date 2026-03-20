import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { humanizeArticle } from "@/lib/guide/humanize-step";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
  const { id: guideId } = await params;

  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
  });

  if (!guide) {
    return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
  }

  if (!guide.guideHtml) {
    return NextResponse.json(
      { error: "L'article V1 doit être généré avant l'humanisation" },
      { status: 400 }
    );
  }

  // Lancer en arrière-plan sans await
  humanizeArticle(guideId).catch(console.error);

  return NextResponse.json({ started: true });
}
