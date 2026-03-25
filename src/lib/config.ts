import { prisma } from "@/lib/prisma";

export type ModelPurpose = "generation" | "humanization";

const MODEL_CONFIG_KEYS: Record<ModelPurpose, string> = {
  generation: "model_generation",
  humanization: "model_humanization",
};

/**
 * Get the configured model for a specific purpose.
 * - "generation" : used for all steps (analysis, plan, article, enrichments)
 * - "humanization" : used for V2 humanization only
 */
export async function getConfigModel(purpose: ModelPurpose): Promise<string> {
  const specific = await prisma.appConfig.findUnique({
    where: { key: MODEL_CONFIG_KEYS[purpose] },
  });
  if (specific?.value) return specific.value;

  // Fallback: if humanization not set, use generation model
  if (purpose === "humanization") {
    const gen = await prisma.appConfig.findUnique({
      where: { key: MODEL_CONFIG_KEYS.generation },
    });
    if (gen?.value) return gen.value;
  }

  return "gpt-4o";
}
