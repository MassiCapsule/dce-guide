import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePlan } from "@/lib/guide/plan-generator";

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

  // Lancer en arrière-plan sans await
  generatePlan(guideId).catch(console.error);

  return NextResponse.json({ started: true });
}
