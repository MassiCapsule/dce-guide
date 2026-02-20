import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const media = await prisma.media.findUnique({ where: { id } });

  if (!media) {
    return NextResponse.json(
      { error: "Media introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json(media);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const media = await prisma.media.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(media);
  } catch (e: any) {
    if (e.code === "P2025") {
      return NextResponse.json(
        { error: "Media introuvable" },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.media.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.code === "P2025") {
      return NextResponse.json(
        { error: "Media introuvable" },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
