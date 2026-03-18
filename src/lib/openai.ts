import OpenAI from "openai";
import { prisma } from "./prisma";

export async function getOpenAIClient(): Promise<OpenAI> {
  const dbConfig = await prisma.appConfig.findFirst({ where: { key: "openai_api_key" } });
  const apiKey = dbConfig?.value || process.env.OPENAI_API_KEY;
  return new OpenAI({ apiKey });
}

// Legacy singleton (fallback for env-only usage)
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
