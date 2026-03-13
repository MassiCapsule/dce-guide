import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeGuidePipeline } from "@/lib/guide/pipeline";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
  const { id } = await params;

  const guide = await prisma.guide.findUnique({
    where: { id },
    include: { products: true, keywords: true },
  });

  if (!guide) {
    return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
  }

  if (guide.products.length < 2) {
    return NextResponse.json(
      { error: "Le guide doit contenir au moins 2 produits" },
      { status: 400 }
    );
  }

  if (guide.keywords.length < 1) {
    return NextResponse.json(
      { error: "Le guide doit avoir au moins 1 mot-cle" },
      { status: 400 }
    );
  }

  // Fire and forget — pipeline runs in background
  executeGuidePipeline(id).catch((err) => {
    console.error("Pipeline guide erreur non geree:", err);
  });

  return NextResponse.json({ started: true });
}
