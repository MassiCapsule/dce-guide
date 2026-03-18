import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";

export async function getAnthropicClient(): Promise<Anthropic> {
  const dbConfig = await prisma.appConfig.findFirst({ where: { key: "anthropic_api_key" } });
  const apiKey = dbConfig?.value || process.env.ANTHROPIC_API_KEY;
  return new Anthropic({ apiKey });
}
