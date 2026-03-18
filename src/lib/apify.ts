import { ApifyClient } from "apify-client";
import { prisma } from "./prisma";

export async function getApifyClient(): Promise<ApifyClient> {
  const dbConfig = await prisma.appConfig.findFirst({ where: { key: "apify_api_token" } });
  const token = dbConfig?.value || process.env.APIFY_API_TOKEN;
  return new ApifyClient({ token });
}

// Legacy singleton (fallback for env-only usage)
export const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});
