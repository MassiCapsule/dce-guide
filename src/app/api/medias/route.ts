import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const medias = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(medias);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const media = await prisma.media.create({ data: body });
    return NextResponse.json(media, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
