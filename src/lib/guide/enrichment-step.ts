import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";
import { calculateCost } from "@/lib/pricing";
import { parsePlanJson } from "./plan-types";
// Plus de fallback hardcodé — les prompts doivent être configurés dans Paramètres

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const bullet = (s: string) => (s.startsWith("- ") ? s : `- ${s}`);

/**
 * Supprime les balises <strong> de tout le HTML SAUF dans les headings (h1-h6)
 * et le chapô (<p class="chapo">).
 */
export function stripBoldFromBody(html: string): string {
  const preserved: string[] = [];

  // Préserver les headings et le chapô
  let result = html.replace(/<(h[1-6])[^>]*>[\s\S]*?<\/\1>/gi, (match) => {
    preserved.push(match);
    return `__PRESERVED_${preserved.length - 1}__`;
  });
  result = result.replace(/<p[^>]*class="chapo"[^>]*>[\s\S]*?<\/p>/gi, (match) => {
    preserved.push(match);
    return `__PRESERVED_${preserved.length - 1}__`;
  });

  // Supprimer le gras partout ailleurs
  result = result.replace(/<\/?strong>/gi, "");

  // Restaurer les sections préservées
  for (let i = 0; i < preserved.length; i++) {
    result = result.replace(`__PRESERVED_${i}__`, preserved[i]);
  }

  return result;
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/^```html\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * Extrait une section du plan depuis le JSON structuré.
 */
function extractSectionFromJson(
  planJsonStr: string | null | undefined,
  sectionName: string
): string {
  const plan = parsePlanJson(planJsonStr);
  if (!plan) return "";

  const key = sectionName.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents

  if (key === "chapo" && plan.chapo) {
    let text = "";
    if (plan.chapo.brief) {
      text += `Brief : ${plan.chapo.brief}\n`;
    }
    if (plan.chapo.mots_cles?.length) {
      text += `Mots-clés : ${plan.chapo.mots_cles.join(", ")}\n`;
    }
    if (plan.chapo.nombre_mots) {
      text += `Nombre de mots : ${plan.chapo.nombre_mots}\n`;
    }
    return text.trim();
  }

  if (key === "introduction" && plan.introduction) {
    let text = "";
    if (plan.introduction.brief) {
      text += `Brief : ${plan.introduction.brief}\n`;
    }
    if (plan.introduction.mots_cles?.length) {
      text += `Mots-clés : ${plan.introduction.mots_cles.join(", ")}\n`;
    }
    if (plan.introduction.nombre_mots) {
      text += `Nombre de mots : ${plan.introduction.nombre_mots}\n`;
    }
    return text.trim();
  }

  if (key === "criteres" && plan.criteres) {
    let text = "";
    if (plan.criteres["Titre H2"]) {
      text += `## ${plan.criteres["Titre H2"]}\n`;
    }
    if (plan.criteres.brief) {
      text += `Brief : ${plan.criteres.brief}\n`;
    }
    if (plan.criteres.mots_cles?.length) {
      text += `Mots-clés : ${plan.criteres.mots_cles.join(", ")}\n`;
    }
    if (plan.criteres.nombre_mots) {
      text += `Nombre de mots : ${plan.criteres.nombre_mots}\n`;
    }
    if (plan.criteres.structure) {
      text += `Structure : ${plan.criteres.structure}\n`;
    }
    if (plan.criteres.items?.length) {
      text += `\nCritères à rédiger (dans cet ordre exact) :\n`;
      plan.criteres.items.forEach((item, i) => {
        text += `${i + 1}. ${item.nom} : ${item.description}\n`;
      });
    }
    return text.trim();
  }

  if (key === "faq" && plan.faq) {
    let text = "";
    if (plan.faq.brief) {
      text += `Brief : ${plan.faq.brief}\n`;
    }
    if (plan.faq.mots_cles?.length) {
      text += `Mots-clés : ${plan.faq.mots_cles.join(", ")}\n`;
    }
    if (plan.faq.nombre_mots) {
      text += `Nombre de mots : ${plan.faq.nombre_mots}\n`;
    }
    if (plan.faq.items?.length) {
      text += `\nQuestions à traiter (dans cet ordre exact) :\n`;
      plan.faq.items.forEach((item, i) => {
        text += `${i + 1}. ${item.nom}\n`;
      });
    }
    return text.trim();
  }

  return "";
}

/**
 * Extrait la liste des produits du plan JSON pour le sommaire.
 * Retourne nom, prix et URL de chaque produit.
 */
function extractProductListFromJson(planJsonStr: string | null | undefined): string {
  const plan = parsePlanJson(planJsonStr);
  if (!plan?.produits?.length) return "";

  let text = "Produits à présenter (dans cet ordre) :\n";
  plan.produits.forEach((p, i) => {
    text += `${i + 1}. ${p["Titre H2"]} — ${p.prix} — ${p.url}\n`;
  });
  return text.trim();
}

/**
 * Load a prompt from AppConfig (DB). Throws if missing.
 */
export async function loadPrompt(key: string): Promise<string> {
  const row = await prisma.appConfig.findUnique({ where: { key } });
  if (!row?.value?.trim()) {
    throw new Error(`Prompt manquant dans Paramètres : "${key}". Configurez-le dans /parametres > Prompts.`);
  }
  return row.value.trim();
}

/**
 * Replace common media / keyword / resume placeholders in a prompt string.
 */
/**
 * Charge les mots interdits depuis AppConfig (clé `forbidden_words`).
 * Retourne un tableau de strings.
 */
export async function loadForbiddenWords(): Promise<string[]> {
  const row = await prisma.appConfig.findUnique({ where: { key: "forbidden_words" } });
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Formate les mots interdits en liste à puces.
 */
export function formatForbiddenWords(words: string[]): string {
  return words.length > 0 ? words.map(bullet).join("\n") : "(aucun)";
}

export function resolveMediaPlaceholders(
  prompt: string,
  media: { name: string; toneDescription: string; writingStyle: string },
  keyword: string,
  resume: string,
  planSection: string = "",
  forbiddenFormatted: string = "(aucun)"
): string {
  return prompt
    .replace(/\{media\.name\}/g, media.name || "")
    .replace(/\{media\.toneDescription\}/g, media.toneDescription || "")
    .replace(/\{media\.writingStyle\}/g, media.writingStyle || "")
    .replace(/\{forbiddenWords\}/g, forbiddenFormatted)
    .replace(/\{keyword\}/g, keyword)
    .replace(/\{resume\}/g, resume)
    .replace(/\{planSection\}/g, planSection);
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
  const template = await loadPrompt("prompt_resume");
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
}

/**
 * Run 5 parallel AI calls (chapo, sommaire, critères sélection, FAQ, meta) and persist results to DB.
 * Returns the total cost of all calls.
 */
export async function generateEnrichments(
  guideId: string,
  summary: string,
  media: EnrichmentMedia,
  keyword: string,
  model: string,
  planJson: string = ""
): Promise<{ totalCost: number }> {
  // Extraire les sections du plan pour chaque élément (JSON prioritaire, fallback HTML)
  const chapoPlanSection = [
    extractSectionFromJson(planJson, "Chapô"),
    extractSectionFromJson(planJson, "Introduction"),
  ].filter(Boolean).join("\n\n");
  const sommairePlanSection = extractProductListFromJson(planJson);
  const criteresSelectionPlanSection = extractSectionFromJson(planJson, "Critères");
  const faqPlanSection = extractSectionFromJson(planJson, "FAQ");

  // Load all 5 prompts + forbidden words in parallel
  const [chapoTemplate, sommaireTemplate, criteresSelectionTemplate, faqTemplate, metaTemplate, forbiddenWords] =
    await Promise.all([
      loadPrompt("prompt_chapo"),
      loadPrompt("prompt_sommaire"),
      loadPrompt("prompt_criteres_selection"),
      loadPrompt("prompt_faq"),
      loadPrompt("prompt_meta"),
      loadForbiddenWords(),
    ]);

  const forbiddenFormatted = formatForbiddenWords(forbiddenWords);

  // Resolve placeholders (avec section du plan correspondante)
  const chapoPrompt = resolveMediaPlaceholders(chapoTemplate, media, keyword, summary, chapoPlanSection, forbiddenFormatted);
  const sommairePrompt = resolveMediaPlaceholders(sommaireTemplate, media, keyword, summary, sommairePlanSection, forbiddenFormatted);
  const criteresSelectionPrompt = resolveMediaPlaceholders(criteresSelectionTemplate, media, keyword, summary, criteresSelectionPlanSection, forbiddenFormatted);
  const faqPrompt = resolveMediaPlaceholders(faqTemplate, media, keyword, summary, faqPlanSection, forbiddenFormatted);
  const metaPrompt = resolveMediaPlaceholders(metaTemplate, media, keyword, summary, "", forbiddenFormatted);

  // 5 parallel AI calls
  const [chapoResult, sommaireResult, criteresSelectionResult, faqResult, metaResult] =
    await Promise.allSettled([
      chatCompletion(model, [{ role: "user", content: chapoPrompt }], {
        temperature: 0.7,
        maxTokens: 2048,
      }),
      chatCompletion(model, [{ role: "user", content: sommairePrompt }], {
        temperature: 0.7,
        maxTokens: 2048,
      }),
      chatCompletion(model, [{ role: "user", content: criteresSelectionPrompt }], {
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

  if (criteresSelectionResult.status === "fulfilled") {
    const r = criteresSelectionResult.value;
    totalCost += calculateCost(model, r.promptTokens, r.completionTokens);
    updateData.criteresHtml = cleanMarkdown(r.content);
  } else {
    console.error("Enrichment criteres selection failed:", criteresSelectionResult.reason);
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
