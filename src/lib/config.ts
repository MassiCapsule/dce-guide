import { prisma } from "@/lib/prisma";

export async function getConfigModel(): Promise<string> {
  const config = await prisma.appConfig.findUnique({
    where: { key: "openai_model" },
  });
  return config?.value || "gpt-4o";
}
