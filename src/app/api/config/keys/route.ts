import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const dbOpenai = await prisma.appConfig.findFirst({ where: { key: "openai_api_key" } });
  const dbAnthropic = await prisma.appConfig.findFirst({ where: { key: "anthropic_api_key" } });
  const dbApify = await prisma.appConfig.findFirst({ where: { key: "apify_api_token" } });
  const dbSerpmantics = await prisma.appConfig.findFirst({ where: { key: "serpmantics_api_key" } });

  const openaiKey = dbOpenai?.value || process.env.OPENAI_API_KEY || "";
  const anthropicKey = dbAnthropic?.value || process.env.ANTHROPIC_API_KEY || "";
  const apifyToken = dbApify?.value || process.env.APIFY_API_TOKEN || "";
  const serpmanticsKey = dbSerpmantics?.value || process.env.SERPMANTICS_API_KEY || "";

  return NextResponse.json({
    openai: openaiKey ? `sk-...${openaiKey.slice(-4)}` : "",
    anthropic: anthropicKey ? `sk-ant-...${anthropicKey.slice(-4)}` : "",
    apify: apifyToken ? `apify_...${apifyToken.slice(-4)}` : "",
    serpmantics: serpmanticsKey ? `key_...${serpmanticsKey.slice(-4)}` : "",
  });
}
