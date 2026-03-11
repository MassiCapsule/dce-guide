import { NextResponse } from "next/server";

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY || "";
  const apifyToken = process.env.APIFY_API_TOKEN || "";
  const serpmanticsKey = process.env.SERPMANTICS_API_KEY || "";

  return NextResponse.json({
    openai: openaiKey ? `sk-...${openaiKey.slice(-4)}` : "",
    apify: apifyToken ? `apify_...${apifyToken.slice(-4)}` : "",
    serpmantics: serpmanticsKey ? `key_...${serpmanticsKey.slice(-4)}` : "",
  });
}
