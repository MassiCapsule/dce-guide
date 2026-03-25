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
      keywords: { orderBy: { id: "asc" } },
    },
  });

  if (!guide) {
    return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
  }

  return NextResponse.json(guide);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.criteria !== undefined) data.criteria = body.criteria;
  if (body.planHtml !== undefined) data.planHtml = body.planHtml;
  if (body.planJson !== undefined) data.planJson = body.planJson;
  if (body.slug !== undefined) data.slug = body.slug;
  if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle;
  if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription;
  if (body.imageCaption !== undefined) data.imageCaption = body.imageCaption;

  const guide = await prisma.guide.update({
    where: { id },
    data,
  });

  return NextResponse.json(guide);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;

  await prisma.guide.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
