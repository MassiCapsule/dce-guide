import { openai } from "@/lib/openai";

export async function generateStream(prompt: string) {
  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
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
    temperature: 0.7,
    max_tokens: 4096,
  });

  return stream;
}
