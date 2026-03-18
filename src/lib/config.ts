import { prisma } from "@/lib/prisma";

export type ModelPurpose = "generation" | "analysis" | "plan";

const MODEL_CONFIG_KEYS: Record<ModelPurpose, string> = {
  generation: "model_generation",
  analysis: "model_analysis",
  plan: "model_plan",
};

/**
 * Get the configured model for a specific purpose.
 * Falls back to the legacy `openai_model` key, then to "gpt-4o".
 */
export async function getConfigModel(purpose?: ModelPurpose): Promise<string> {
  // Try purpose-specific key first
  if (purpose) {
    const specific = await prisma.appConfig.findUnique({
      where: { key: MODEL_CONFIG_KEYS[purpose] },
    });
    if (specific?.value) return specific.value;
  }

  // Fallback to legacy global key
  const global = await prisma.appConfig.findUnique({
    where: { key: "openai_model" },
  });
  return global?.value || "gpt-4o";
}
