import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  const [cards, total] = await Promise.all([
    prisma.generatedProductCard.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        media: {
          select: {
            id: true,
            name: true,
          },
        },
        intelligence: {
          select: {
            id: true,
            asin: true,
            productTitle: true,
            productBrand: true,
            productImageUrl: true,
          },
        },
      },
    }),
    prisma.generatedProductCard.count(),
  ]);

  return NextResponse.json({
    data: cards,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
