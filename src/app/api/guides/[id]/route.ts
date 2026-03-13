import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;

  const guide = await prisma.guide.findUnique({
    where: { id },
    include: {
      media: true,
      products: {
        orderBy: { position: "asc" },
        include: {
          intelligence: true,
          generatedCard: true,
        },
      },
      keywords: true,
    },
  });

  if (!guide) {
    return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
  }

  return NextResponse.json(guide);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;

  await prisma.guide.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
