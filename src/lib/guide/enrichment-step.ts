import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";
import { calculateCost } from "@/lib/pricing";
import {
  RESUME_PROMPT,
  CHAPO_PROMPT,
  SOMMAIRE_PROMPT,
  FAQ_PROMPT,
  META_PROMPT,
} from "@/app/api/config/prompts/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const bullet = (s: string) => (s.startsWith("- ") ? s : `- ${s}`);

function cleanMarkdown(text: string): string {
  return text
    .replace(/^```html\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * Load a prompt from AppConfig (DB). Falls back to the provided default.
 */
export async function loadPrompt(
  key: string,
  fallback: string
): Promise<string> {
  const row = await prisma.appConfig.findUnique({ where: { key } });
  return row?.value?.trim() || fallback;
}

/**
 * Replace common media / keyword / resume placeholders in a prompt string.
 */
export function resolveMediaPlaceholders(
  prompt: string,
  media: { name: string; toneDescription: string; writingStyle: string; forbiddenWords: string },
  keyword: string,
  resume: string
): string {
  let forbiddenList: string[] = [];
  try {
    forbiddenList = JSON.parse(media.forbiddenWords || "[]");
  } catch {
    forbiddenList = [];
  }
  const forbiddenFormatted =
    forbiddenList.length > 0 ? forbiddenList.map(bullet).join("\n") : "(aucun)";

  return prompt
    .replace(/\{media\.name\}/g, media.name || "")
    .replace(/\{media\.toneDescription\}/g, media.toneDescription || "")
    .replace(/\{media\.writingStyle\}/g, media.writingStyle || "")
    .replace(/\{forbiddenWords\}/g, forbiddenFormatted)
    .replace(/\{keyword\}/g, keyword)
    .replace(/\{resume\}/g, resume);
}

// ---------------------------------------------------------------------------
// parseMetaResponse
// ---------------------------------------------------------------------------

export interface MetaFields {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  imageCaption: string;
}

/**
 * Parse the structured text response from the meta AI call.
 * Handles accented labels (Slug, Meta/Méta Title, Meta/Méta Description, Légende/Legende).
 */
export function parseMetaResponse(text: string): MetaFields {
  const slugMatch = text.match(/Slug\s*:\s*(.+)/i);
  const titleMatch = text.match(/M[eé]ta\s+Title\s*(?:\([^)]*\))?\s*:\s*(.+)/i);
  const descMatch = text.match(/M[eé]ta\s+Description\s*(?:\([^)]*\))?\s*:\s*(.+)/i);
  const captionMatch = text.match(/L[eé]gende\s*:\s*(.+)/i);

  return {
    slug: slugMatch?.[1]?.trim() || "",
    metaTitle: titleMatch?.[1]?.trim() || "",
    metaDescription: descMatch?.[1]?.trim() || "",
    imageCaption: captionMatch?.[1]?.trim() || "",
  };
}

// ---------------------------------------------------------------------------
// generateSummary
// ---------------------------------------------------------------------------

/**
 * Summarise the full article HTML using AI.
 * Returns the summary text and the cost of the call.
 */
export async function generateSummary(
  articleHtml: string,
  model: string
): Promise<{ summary: string; cost: number }> {
  const template = await loadPrompt("prompt_resume", RESUME_PROMPT);
  const prompt = template.replace(/\{article\}/g, articleHtml);

  const result = await chatCompletion(
    model,
    [{ role: "user", content: prompt }],
    { temperature: 0.7, maxTokens: 1024 }
  );

  const cost = calculateCost(model, result.promptTokens, result.completionTokens);
  return { summary: result.content.trim(), cost };
}

// ---------------------------------------------------------------------------
// generateEnrichments
// ---------------------------------------------------------------------------

interface EnrichmentMedia {
  name: string;
  toneDescription: string;
  writingStyle: string;
  forbiddenWords: string;
}

/**
 * Run 4 parallel AI calls (chapo, sommaire, FAQ, meta) and persist results to DB.
 * Returns the total cost of all calls.
 */
export async function generateEnrichments(
  guideId: string,
  summary: string,
  media: EnrichmentMedia,
  keyword: string,
  model: string
): Promise<{ totalCost: number }> {
  // Load all 4 prompts in parallel
  const [chapoTemplate, sommaireTemplate, faqTemplate, metaTemplate] =
    await Promise.all([
      loadPrompt("prompt_chapo", CHAPO_PROMPT),
      loadPrompt("prompt_sommaire", SOMMAIRE_PROMPT),
      loadPrompt("prompt_faq", FAQ_PROMPT),
      loadPrompt("prompt_meta", META_PROMPT),
    ]);

  // Resolve placeholders
  const chapoPrompt = resolveMediaPlaceholders(chapoTemplate, media, keyword, summary);
  const sommairePrompt = resolveMediaPlaceholders(sommaireTemplate, media, keyword, summary);
  const faqPrompt = resolveMediaPlaceholders(faqTemplate, media, keyword, summary);
  const metaPrompt = resolveMediaPlaceholders(metaTemplate, media, keyword, summary);

  // 4 parallel AI calls
  const [chapoResult, sommaireResult, faqResult, metaResult] =
    await Promise.allSettled([
      chatCompletion(model, [{ role: "user", content: chapoPrompt }], {
        temperature: 0.7,
        maxTokens: 2048,
      }),
      chatCompletion(model, [{ role: "user", content: sommairePrompt }], {
        temperature: 0.7,
        maxTokens: 2048,
      }),
      chatCompletion(model, [{ role: "user", content: faqPrompt }], {
        temperature: 0.7,
        maxTokens: 2048,
      }),
      chatCompletion(model, [{ role: "user", content: metaPrompt }], {
        temperature: 0.7,
        maxTokens: 1024,
      }),
    ]);

  // Process results
  let totalCost = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {};

  if (chapoResult.status === "fulfilled") {
    const r = chapoResult.value;
    totalCost += calculateCost(model, r.promptTokens, r.completionTokens);
    updateData.chapoHtml = cleanMarkdown(r.content);
  } else {
    console.error("Enrichment chapo failed:", chapoResult.reason);
  }

  if (sommaireResult.status === "fulfilled") {
    const r = sommaireResult.value;
    totalCost += calculateCost(model, r.promptTokens, r.completionTokens);
    updateData.sommaireHtml = cleanMarkdown(r.content);
  } else {
    console.error("Enrichment sommaire failed:", sommaireResult.reason);
  }

  if (faqResult.status === "fulfilled") {
    const r = faqResult.value;
    totalCost += calculateCost(model, r.promptTokens, r.completionTokens);
    updateData.faqHtml = cleanMarkdown(r.content);
  } else {
    console.error("Enrichment faq failed:", faqResult.reason);
  }

  if (metaResult.status === "fulfilled") {
    const r = metaResult.value;
    totalCost += calculateCost(model, r.promptTokens, r.completionTokens);
    const meta = parseMetaResponse(r.content);
    updateData.slug = meta.slug;
    updateData.metaTitle = meta.metaTitle;
    updateData.metaDescription = meta.metaDescription;
    updateData.imageCaption = meta.imageCaption;
  } else {
    console.error("Enrichment meta failed:", metaResult.reason);
  }

  // Single DB update with all results
  if (Object.keys(updateData).length > 0) {
    await prisma.guide.update({
      where: { id: guideId },
      data: updateData,
    });
  }

  return { totalCost };
}
