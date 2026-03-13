import { openai } from "@/lib/openai";
import type { AmazonProductData } from "@/lib/scraper/amazon-product";
import type { AmazonReview } from "@/lib/scraper/amazon-reviews";

export interface ReviewAnalysis {
  positioningSummary: string;
  keyFeatures: string[];
  detectedUsages: string[];
  recurringProblems: string[];
  buyerProfiles: string[];
  sentimentScore: number;
  strengthPoints: string[];
  weaknessPoints: string[];
  remarkableQuotes: string[];
}

export interface AnalysisResult {
  analysis: ReviewAnalysis;
  promptTokens: number;
  completionTokens: number;
  model: string;
}

export async function analyzeReviews(
  product: AmazonProductData,
  reviews: AmazonReview[],
  model: string = "gpt-4o"
): Promise<AnalysisResult> {
  const systemPrompt = `Tu es un expert analyste produit. Tu analyses les donnees produit et les avis clients pour en extraire une intelligence produit structuree. Tu reponds toujours en francais et en JSON valide.`;

  const userPrompt = `Analyse le produit suivant et ses avis clients. Fournis une analyse structuree en JSON.

## Produit
- Titre : ${product.title}
- Marque : ${product.brand}
- Prix : ${product.price}
- Note : ${product.rating}/5 (${product.reviewCount} avis)
- Description : ${product.description}
- Caracteristiques : ${(product.features || []).join(", ")}

## Avis clients (${reviews.length} avis)
${reviews
  .slice(0, 80)
  .map(
    (r, i) =>
      `[Avis ${i + 1}] Note: ${r.rating}/5 | Verifie: ${r.verified ? "Oui" : "Non"}\nTitre: ${r.title}\n${r.text}`
  )
  .join("\n\n")}

## Format de reponse attendu (JSON)
{
  "positioningSummary": "Resume du positionnement produit en 2-3 phrases",
  "keyFeatures": ["caracteristique cle 1", "caracteristique cle 2", ...],
  "detectedUsages": ["usage detecte 1", "usage detecte 2", ...],
  "recurringProblems": ["probleme recurrent 1", "probleme recurrent 2", ...],
  "buyerProfiles": ["profil acheteur 1", "profil acheteur 2", ...],
  "sentimentScore": 0.0 a 1.0,
  "strengthPoints": ["point fort 1", ... (8 a 12 elements)],
  "weaknessPoints": ["point faible 1", ... (5 a 8 elements)],
  "remarkableQuotes": ["citation remarquable 1", ... (6 a 12 elements)]
}`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Reponse vide de l'API OpenAI");
  }

  const parsed = JSON.parse(content) as ReviewAnalysis;

  return {
    analysis: {
      positioningSummary: parsed.positioningSummary || "",
      keyFeatures: parsed.keyFeatures || [],
      detectedUsages: parsed.detectedUsages || [],
      recurringProblems: parsed.recurringProblems || [],
      buyerProfiles: parsed.buyerProfiles || [],
      sentimentScore: typeof parsed.sentimentScore === "number" ? parsed.sentimentScore : 0,
      strengthPoints: parsed.strengthPoints || [],
      weaknessPoints: parsed.weaknessPoints || [],
      remarkableQuotes: parsed.remarkableQuotes || [],
    },
    promptTokens: response.usage?.prompt_tokens || 0,
    completionTokens: response.usage?.completion_tokens || 0,
    model,
  };
}
