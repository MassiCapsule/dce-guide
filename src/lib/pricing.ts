/** Pricing per 1M tokens (USD) — updated Feb 2025 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o":      { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4-turbo": { input: 10.00, output: 30.00 },
  "o1":          { input: 15.00, output: 60.00 },
  "o1-mini":     { input: 1.10, output: 4.40 },
};

export const AVAILABLE_MODELS = Object.keys(MODEL_PRICING);

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["gpt-4o"];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal precision
}

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `${(cost * 100).toFixed(3)} ¢`;
  }
  return `${cost.toFixed(4)} $`;
}
