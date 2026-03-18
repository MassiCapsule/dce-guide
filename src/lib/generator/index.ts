import { chatCompletionStream } from "@/lib/ai-client";

export interface GenerateResult {
  stream: AsyncIterable<string>;
  getUsage: () => { promptTokens: number; completionTokens: number } | null;
}

export async function generateStream(prompt: string, model: string = "gpt-4o"): Promise<GenerateResult> {
  return chatCompletionStream(model, [
    { role: "system", content: prompt },
    { role: "user", content: "Genere la fiche produit complete en suivant les instructions ci-dessus." },
  ], { temperature: 0.7, maxTokens: 4096 });
}
