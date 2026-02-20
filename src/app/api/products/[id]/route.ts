import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const card = await prisma.generatedProductCard.findUnique({
    where: { id },
    include: {
      media: true,
      intelligence: true,
    },
  });

  if (!card) {
    return NextResponse.json(
      { error: "Fiche produit introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json(card);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.generatedProductCard.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.code === "P2025") {
      return NextResponse.json(
        { error: "Fiche produit introuvable" },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
