import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;

  // Delete related records first (no cascade configured)
  await prisma.guideProduct.deleteMany({ where: { intelligenceId: id } });
  await prisma.generatedProductCard.deleteMany({ where: { intelligenceId: id } });
  await prisma.productIntelligence.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
