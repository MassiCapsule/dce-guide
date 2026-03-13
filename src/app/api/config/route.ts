import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const configs = await prisma.appConfig.findMany();
  const map: Record<string, string> = {};
  for (const c of configs) map[c.key] = c.value;
  return NextResponse.json(map);
}

export async function POST(req: Request) {
  const { key, value } = await req.json();
  if (!key || value === undefined) {
    return NextResponse.json({ error: "key et value requis" }, { status: 400 });
  }
  const config = await prisma.appConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  return NextResponse.json(config);
}
