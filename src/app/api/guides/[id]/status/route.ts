import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;

  const guide = await prisma.guide.findUnique({
    where: { id },
    select: {
      status: true,
      currentStep: true,
      errorMessage: true,
      totalCost: true,
      _count: { select: { products: true } },
    },
  });

  if (!guide) {
    return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    status: guide.status,
    currentStep: guide.currentStep,
    totalProducts: guide._count.products,
    errorMessage: guide.errorMessage,
    totalCost: guide.totalCost,
  });
}
