import type { PromptSegment, AnnotatedPrompt } from "./annotated";

interface PlanPromptData {
  mediaName: string;
  motClePrincipal: string;
  nombreMots: number;
  criteres: string;
  resumeProduits: string;
  motsCles: string;
  forbiddenWords: string;
  toneDescription: string;
  writingStyle: string;
}

/**
 * Builds an annotated prompt from a plan template string.
 * Replaces #Placeholder variables with actual data and marks each replacement.
 */
export function buildPlanAnnotated(
  template: string,
  data: PlanPromptData
): AnnotatedPrompt {
  const replacements: Record<string, { name: string; value: string }> = {
    "#NomMedia": { name: "NomMedia", value: data.mediaName },
    "#MotClePrincipal": { name: "MotClePrincipal", value: data.motClePrincipal },
    "#NombreMots": { name: "NombreMots", value: String(data.nombreMots) },
    "#Criteres": { name: "Criteres", value: data.criteres },
    "#ResumeProduits": { name: "ResumeProduits", value: data.resumeProduits },
    "#MotsCles": { name: "MotsCles", value: data.motsCles },
    "{forbiddenWords}": { name: "forbiddenWords", value: data.forbiddenWords },
    "{media.toneDescription}": { name: "media.toneDescription", value: data.toneDescription },
    "{media.writingStyle}": { name: "media.writingStyle", value: data.writingStyle },
  };

  const placeholderRegex = /(#(?:NomMedia|MotClePrincipal|NombreMots|Criteres|ResumeProduits|MotsCles)|\{(?:forbiddenWords|media\.toneDescription|media\.writingStyle)\})/g;

  const segments: PromptSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(template)) !== null) {
    const fullMatch = match[0];
    const replacement = replacements[fullMatch];

    if (match.index > lastIndex) {
      segments.push({ type: "static", text: template.slice(lastIndex, match.index) });
    }

    if (replacement) {
      segments.push({ type: "variable", name: replacement.name, text: replacement.value });
    } else {
      segments.push({ type: "static", text: fullMatch });
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < template.length) {
    segments.push({ type: "static", text: template.slice(lastIndex) });
  }

  const fullPrompt = segments.map((seg) => seg.text).join("");

  return { segments, fullPrompt };
}
