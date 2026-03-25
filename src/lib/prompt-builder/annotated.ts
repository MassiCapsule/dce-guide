import type { Media, ProductIntelligence } from "@prisma/client";

export interface PromptSegment {
  type: "static" | "variable";
  text: string;
  name?: string;
}

export interface AnnotatedPrompt {
  segments: PromptSegment[];
  fullPrompt: string;
}

/**
 * Builds an annotated prompt from a template string loaded from AppConfig.
 * Replaces {placeholder} variables with actual data and marks each replacement.
 */
export function buildAnnotatedFromTemplate(
  template: string,
  media: Media,
  intelligence: ProductIntelligence,
  keyword: string,
  wordCount: number,
  planSection?: string,
  forbiddenWords: string[] = []
): AnnotatedPrompt {
  // Parse JSON string fields
  const parseJson = (str: string): string[] => {
    try { return JSON.parse(str); } catch { return []; }
  };

  const doRules = parseJson(media.doRules);
  const dontRules = parseJson(media.dontRules);
  const keyFeatures = parseJson(intelligence.keyFeatures);
  const detectedUsages = parseJson(intelligence.detectedUsages);
  const recurringProblems = parseJson(intelligence.recurringProblems);
  const buyerProfiles = parseJson(intelligence.buyerProfiles);
  const strengthPoints = parseJson(intelligence.strengthPoints);
  const weaknessPoints = parseJson(intelligence.weaknessPoints);
  const remarkableQuotes = parseJson(intelligence.remarkableQuotes);

  // Helper: prefix with "- " only if not already starting with "- "
  const bullet = (s: string) => s.startsWith("- ") ? s : `- ${s}`;

  // Map of all known placeholders → resolved values
  const replacements: Record<string, string> = {
    // Media
    "{media.name}": media.name,
    "{media.toneDescription}": media.toneDescription,
    "{media.writingStyle}": media.writingStyle,
    "{media.productStructureTemplate}": media.productStructureTemplate || "",
    "{doRules}": doRules.map(bullet).join("\n"),
    "{dontRules}": dontRules.map(bullet).join("\n"),
    "{forbiddenWords}": forbiddenWords.map(bullet).join("\n"),

    // Product Intelligence
    "{intelligence.productTitle}": intelligence.productTitle,
    "{intelligence.shortTitle}": intelligence.shortTitle,
    "{intelligence.productBrand}": intelligence.productBrand,
    "{intelligence.productPrice}": intelligence.productPrice,
    "{intelligence.asin}": intelligence.asin,
    "{intelligence.positioningSummary}": intelligence.positioningSummary,
    "{intelligence.keyFeatures}": keyFeatures.map((f) => `- ${f}`).join("\n"),
    "{intelligence.detectedUsages}": detectedUsages.map((u) => `- ${u}`).join("\n"),
    "{intelligence.buyerProfiles}": buyerProfiles.map((p) => `- ${p}`).join("\n"),
    "{intelligence.strengthPoints}": strengthPoints.map((s) => `- ${s}`).join("\n"),
    "{intelligence.weaknessPoints}": weaknessPoints.map((w) => `- ${w}`).join("\n"),
    "{intelligence.recurringProblems}": recurringProblems.map((p) => `- ${p}`).join("\n"),
    "{intelligence.remarkableQuotes}": remarkableQuotes.map((q) => `> "${q}"`).join("\n"),

    // SEO & generation
    "{keyword}": keyword,
    "{wordCount}": `${wordCount}`,
    "{planSection}": planSection || "",
  };

  // Also support indexed array forms like {doRules[0]}, {doRules[1]}, ...
  // and comma-separated forms like {doRules[0]}, {doRules[1]}, ...
  const arrayFields: Record<string, string[]> = {
    doRules, "intelligence.keyFeatures": keyFeatures,
    "intelligence.detectedUsages": detectedUsages,
    "intelligence.buyerProfiles": buyerProfiles,
    "intelligence.strengthPoints": strengthPoints,
    "intelligence.weaknessPoints": weaknessPoints,
    "intelligence.recurringProblems": recurringProblems,
    "intelligence.remarkableQuotes": remarkableQuotes,
  };

  for (const [field, arr] of Object.entries(arrayFields)) {
    for (let i = 0; i < arr.length; i++) {
      replacements[`{${field}[${i}]}`] = arr[i];
    }
  }

  // Build segments by splitting template on placeholders
  const segments: PromptSegment[] = [];

  // Build regex that matches all known placeholder patterns
  // Match {word.word}, {word.word[n]}, {word[n]}, {word}
  const placeholderRegex = /\{([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)\}/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(template)) !== null) {
    const fullMatch = match[0]; // e.g. {media.name}
    const varName = match[1];   // e.g. media.name

    // Add static text before this match
    if (match.index > lastIndex) {
      segments.push({ type: "static", text: template.slice(lastIndex, match.index) });
    }

    // Resolve the value
    const resolvedValue = replacements[fullMatch];
    if (resolvedValue !== undefined) {
      segments.push({ type: "variable", name: varName, text: resolvedValue });
    } else {
      // Unknown placeholder — keep as-is (static)
      segments.push({ type: "static", text: fullMatch });
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < template.length) {
    segments.push({ type: "static", text: template.slice(lastIndex) });
  }

  const fullPrompt = segments.map((seg) => seg.text).join("");

  return { segments, fullPrompt };
}
