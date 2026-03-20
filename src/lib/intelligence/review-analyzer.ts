import { chatCompletion } from "@/lib/ai-client";
import { prisma } from "@/lib/prisma";
import type { AmazonProductData } from "@/lib/scraper/amazon-product";
import type { AmazonReview } from "@/lib/scraper/amazon-reviews";

export interface ReviewAnalysis {
  shortTitle: string;
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

const DEFAULT_SYSTEM_PROMPT = `Tu es un expert analyste produit. Tu analyses les donnees produit et les avis clients pour en extraire une intelligence produit structuree. Tu reponds toujours en francais et en JSON valide.`;

const DEFAULT_USER_PROMPT = `Analyse le produit suivant et ses avis clients. Fournis une analyse structuree en JSON.

## Produit
- Titre : {title}
- Marque : {brand}
- Prix : {price}
- Note : {rating}/5 ({reviewCount} avis)
- Description : {description}
- Caracteristiques : {features}

## Avis clients ({count} avis)
{reviews}

## Format de reponse attendu (JSON)
{
  "shortTitle": "Titre court du produit (marque + gamme + caracteristique cle, ex: Bosch OptiMUM 1600 W)",
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

function buildReviewsText(reviews: AmazonReview[]): string {
  return reviews
    .slice(0, 80)
    .map(
      (r, i) =>
        `[Avis ${i + 1}] Note: ${r.rating}/5 | Verifie: ${r.verified ? "Oui" : "Non"}\nTitre: ${r.title}\n${r.text}`
    )
    .join("\n\n");
}

function replacePromptPlaceholders(
  template: string,
  product: AmazonProductData,
  reviews: AmazonReview[]
): string {
  return template
    .replace(/\{title\}/g, product.title)
    .replace(/\{brand\}/g, product.brand)
    .replace(/\{price\}/g, product.price)
    .replace(/\{rating\}/g, String(product.rating))
    .replace(/\{reviewCount\}/g, String(product.reviewCount))
    .replace(/\{description\}/g, product.description)
    .replace(/\{features\}/g, (product.features || []).join(", "))
    .replace(/\{count\}/g, String(reviews.length))
    .replace(/\{reviews\}/g, buildReviewsText(reviews));
}

export async function analyzeReviews(
  product: AmazonProductData,
  reviews: AmazonReview[],
  model: string = "gpt-4o"
): Promise<AnalysisResult> {
  // Load prompt from AppConfig (DB), fallback to default
  const promptConfig = await prisma.appConfig.findUnique({
    where: { key: "prompt_analysis" },
  });

  if (!promptConfig?.value?.trim()) {
    throw new Error('Prompt manquant dans Paramètres : "prompt_analysis". Configurez-le dans /parametres > Prompts.');
  }
  const rawPrompt = promptConfig.value;

  // Split on **User** : marker if present, otherwise use full text as user prompt
  let systemPrompt: string;
  let userPromptTemplate: string;

  const userMarker = rawPrompt.indexOf("**User**");
  if (userMarker !== -1) {
    // Find the "**System**" section
    const systemMarker = rawPrompt.indexOf("**System**");
    if (systemMarker !== -1) {
      // Extract system content between **System** : and **User**
      const systemStart = rawPrompt.indexOf(":", systemMarker) + 1;
      systemPrompt = rawPrompt.slice(systemStart, userMarker).trim();
    } else {
      systemPrompt = "Tu es un expert analyste produit. Tu analyses les données produit et les avis clients. Tu réponds toujours en français et en JSON valide.";
    }
    // Extract user content after **User** :
    const userStart = rawPrompt.indexOf(":", userMarker) + 1;
    userPromptTemplate = rawPrompt.slice(userStart).trim();
  } else {
    // No markers — use whole thing as user prompt
    systemPrompt = "Tu es un expert analyste produit. Tu analyses les données produit et les avis clients. Tu réponds toujours en français et en JSON valide.";
    userPromptTemplate = rawPrompt;
  }

  const userPrompt = replacePromptPlaceholders(userPromptTemplate, product, reviews);

  const response = await chatCompletion(model, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { temperature: 0.3, jsonMode: true });

  if (!response.content) {
    throw new Error("Reponse vide de l'API");
  }

  const parsed = JSON.parse(response.content) as ReviewAnalysis;

  return {
    analysis: {
      shortTitle: parsed.shortTitle || "",
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
    promptTokens: response.promptTokens,
    completionTokens: response.completionTokens,
    model,
  };
}
