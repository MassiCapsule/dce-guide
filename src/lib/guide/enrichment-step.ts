import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";
import { calculateCost } from "@/lib/pricing";
import { parsePlanJson } from "./plan-types";
// Plus de fallback hardcodé — les prompts doivent être configurés dans Paramètres

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
 * Convertit du HTML en texte lisible, en préservant la structure.
 */
function htmlToReadableText(html: string): string {
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extrait une section du plan par son nom (ex: "Chapô", "Introduction", "FAQ").
 * Cherche le H2 correspondant et retourne tout le contenu jusqu'au H2 suivant.
 * Supporte aussi le format ::: NomSection ::: en fallback.
 */
function extractPlanSectionByName(planHtml: string, sectionName: string): string {
  if (!planHtml || !sectionName) return "";

  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\sàâäéèêëïîôùûüç]/g, " ").replace(/\s+/g, " ").trim();
  const normalizedName = normalize(sectionName);

  // Méthode 1 : chercher par H2
  const h2Regex = /(<h2[\s\S]*?<\/h2>)/gi;
  const parts = planHtml.split(h2Regex).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/<h2/i.test(part)) {
      const h2Text = normalize(part.replace(/<[^>]+>/g, ""));
      if (h2Text.includes(normalizedName) || normalizedName.includes(h2Text)) {
        // Capturer le contenu après ce H2 jusqu'au prochain H2
        let content = "";
        for (let j = i + 1; j < parts.length; j++) {
          if (/<h2/i.test(parts[j])) break;
          content += parts[j];
        }
        return htmlToReadableText(content);
      }
    }
  }

  // Méthode 2 (fallback) : chercher par ::: NomSection :::
  const text = htmlToReadableText(planHtml);
  const regex = new RegExp(
    `:::\\s*${sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:::([\\s\\S]*?)(?=:::|$)`,
    "i"
  );
  const match = text.match(regex);
  if (match) return match[1].trim();

  return "";
}

/**
 * Extrait la section critères du plan (le H2 entre Introduction et Fiches produits).
 * Le titre de cette section varie selon le plan, on ne peut pas chercher par nom.
 */
function extractCriteriaPlanSection(planHtml: string): string {
  if (!planHtml) return "";

  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\sàâäéèêëïîôùûüç]/g, " ").replace(/\s+/g, " ").trim();

  const h2Regex = /(<h2[\s\S]*?<\/h2>)/gi;
  const parts = planHtml.split(h2Regex).filter(Boolean);

  let foundIntro = false;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/<h2/i.test(part)) {
      const h2Text = normalize(part.replace(/<[^>]+>/g, ""));
      if (h2Text.includes("introduction")) {
        foundIntro = true;
        continue;
      }
      if (foundIntro && !h2Text.includes("fiche") && !h2Text.includes("produit")) {
        // C'est le H2 des critères — capturer son contenu
        let content = "";
        for (let j = i + 1; j < parts.length; j++) {
          if (/<h2/i.test(parts[j])) break;
          content += parts[j];
        }
        return htmlToReadableText(part + content);
      }
      if (foundIntro && (h2Text.includes("fiche") || h2Text.includes("produit"))) {
        break; // Pas de section critères trouvée
      }
    }
  }

  return "";
}

/**
 * Extrait une section du plan depuis le JSON structuré.
 * Fallback sur l'ancien parsing HTML si planJson est vide.
 */
function extractSectionFromJson(
  planJsonStr: string | null | undefined,
  planHtml: string,
  sectionName: string
): string {
  const plan = parsePlanJson(planJsonStr);

  if (plan) {
    const key = sectionName.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents

    if (key === "chapo" && plan.chapo) {
      let text = "";
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
      return text.trim();
    }

    if (key === "faq" && plan.faq) {
      let text = "";
      if (plan.faq.mots_cles?.length) {
        text += `Mots-clés : ${plan.faq.mots_cles.join(", ")}\n`;
      }
      return text.trim();
    }
  }

  // Fallback HTML
  if (sectionName.toLowerCase().includes("critère") || sectionName.toLowerCase().includes("critere")) {
    return extractCriteriaPlanSection(planHtml);
  }
  return extractPlanSectionByName(planHtml, sectionName);
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
  planHtml: string = "",
  planJson: string = ""
): Promise<{ totalCost: number }> {
  // Extraire les sections du plan pour chaque élément (JSON prioritaire, fallback HTML)
  const chapoPlanSection = [
    extractSectionFromJson(planJson, planHtml, "Chapô"),
    extractSectionFromJson(planJson, planHtml, "Introduction"),
  ].filter(Boolean).join("\n\n");
  const sommairePlanSection = extractSectionFromJson(planJson, planHtml, "Critères");
  const criteresSelectionPlanSection = extractSectionFromJson(planJson, planHtml, "Critères");
  const faqPlanSection = extractSectionFromJson(planJson, planHtml, "FAQ");

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
