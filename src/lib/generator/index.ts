import { openai } from "@/lib/openai";

export interface GenerateResult {
  stream: AsyncIterable<any>;
  getUsage: () => { promptTokens: number; completionTokens: number } | null;
}

export async function generateStream(prompt: string, model: string = "gpt-4o"): Promise<GenerateResult> {
  let usage: { promptTokens: number; completionTokens: number } | null = null;

  const stream = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: "Genere la fiche produit complete en suivant les instructions ci-dessus.",
      },
    ],
    stream: true,
    stream_options: { include_usage: true },
    temperature: 0.7,
    max_tokens: 4096,
  });

  // Wrap the stream to capture usage from the last chunk
  const wrappedStream = (async function* () {
    for await (const chunk of stream) {
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens || 0,
          completionTokens: chunk.usage.completion_tokens || 0,
        };
      }
      yield chunk;
    }
  })();

  return {
    stream: wrappedStream,
    getUsage: () => usage,
  };
}
