import type { Media, ProductIntelligence } from "@prisma/client";

export interface KeywordAllocationItem {
  keyword: string;
  targetCount: number;
}

export function buildGenerationPrompt(
  media: Media,
  intelligence: ProductIntelligence,
  keyword: string,
  wordCount: number,
  keywordAllocation?: KeywordAllocationItem[]
): string {
  // Parse JSON string fields from media
  let doRules: string[] = [];
  let dontRules: string[] = [];

  try {
    doRules = JSON.parse(media.doRules);
  } catch {
    doRules = [];
  }

  try {
    dontRules = JSON.parse(media.dontRules);
  } catch {
    dontRules = [];
  }

  // Parse JSON string fields from intelligence
  let keyFeatures: string[] = [];
  let detectedUsages: string[] = [];
  let recurringProblems: string[] = [];
  let buyerProfiles: string[] = [];
  let strengthPoints: string[] = [];
  let weaknessPoints: string[] = [];
  let remarkableQuotes: string[] = [];

  try { keyFeatures = JSON.parse(intelligence.keyFeatures); } catch {}
  try { detectedUsages = JSON.parse(intelligence.detectedUsages); } catch {}
  try { recurringProblems = JSON.parse(intelligence.recurringProblems); } catch {}
  try { buyerProfiles = JSON.parse(intelligence.buyerProfiles); } catch {}
  try { strengthPoints = JSON.parse(intelligence.strengthPoints); } catch {}
  try { weaknessPoints = JSON.parse(intelligence.weaknessPoints); } catch {}
  try { remarkableQuotes = JSON.parse(intelligence.remarkableQuotes); } catch {}

  const sections: string[] = [];

  // 1. System context
  sections.push(`Tu es un redacteur web expert en SEO et en fiches produit e-commerce. Tu rediges en francais, avec un style engageant et professionnel. Tu produis du HTML semantique propre.`);

  // 2. Tone and style
  sections.push(`## Ton et style
- **Media** : ${media.name}
- **Ton** : ${media.toneDescription}
- **Style d'ecriture** : ${media.writingStyle}`);

  // 3. Do/Don't rules
  if (doRules.length > 0) {
    sections.push(`## Regles a suivre (DO)
${doRules.map((r) => `- ${r}`).join("\n")}`);
  }

  if (dontRules.length > 0) {
    sections.push(`## Regles a eviter (DON'T)
${dontRules.map((r) => `- ${r}`).join("\n")}`);
  }

  // 4. Product info
  sections.push(`## Informations produit
- **Titre** : ${intelligence.productTitle}
- **Marque** : ${intelligence.productBrand}
- **Prix** : ${intelligence.productPrice}
- **ASIN** : ${intelligence.asin}
- **Positionnement** : ${intelligence.positioningSummary}`);

  if (keyFeatures.length > 0) {
    sections.push(`### Caracteristiques cles
${keyFeatures.map((f) => `- ${f}`).join("\n")}`);
  }

  if (detectedUsages.length > 0) {
    sections.push(`### Usages detectes
${detectedUsages.map((u) => `- ${u}`).join("\n")}`);
  }

  if (buyerProfiles.length > 0) {
    sections.push(`### Profils acheteurs
${buyerProfiles.map((p) => `- ${p}`).join("\n")}`);
  }

  // 5. Review analysis
  if (strengthPoints.length > 0) {
    sections.push(`## Points forts (issus des avis)
${strengthPoints.map((s) => `- ${s}`).join("\n")}`);
  }

  if (weaknessPoints.length > 0) {
    sections.push(`## Points faibles (issus des avis)
${weaknessPoints.map((w) => `- ${w}`).join("\n")}`);
  }

  if (recurringProblems.length > 0) {
    sections.push(`## Problemes recurrents
${recurringProblems.map((p) => `- ${p}`).join("\n")}`);
  }

  if (remarkableQuotes.length > 0) {
    sections.push(`## Citations remarquables d'acheteurs
${remarkableQuotes.map((q) => `> "${q}"`).join("\n")}`);
  }

  // 6. SEO keyword instruction
  if (keywordAllocation && keywordAllocation.length > 0) {
    sections.push(`## Mots-cles SEO a integrer
Integre les mots-cles suivants dans le texte avec le nombre d'occurrences cible :
${keywordAllocation.map((k) => `- "${k.keyword}" : environ ${k.targetCount} occurrence${k.targetCount > 1 ? "s" : ""}`).join("\n")}
Repartis-les naturellement dans les titres et le corps du texte. Ne fais pas de bourrage de mots-cles.`);
  } else {
    sections.push(`## Mot-cle SEO principal
Le mot-cle principal a cibler est : **${keyword}**
Integre ce mot-cle naturellement dans le titre H1, au moins un H2, l'introduction, et plusieurs fois dans le corps du texte. Ne fais pas de bourrage de mots-cles.`);
  }

  // 7. Structure template
  sections.push(`## Structure de la fiche produit
Suis cette structure pour organiser le contenu :

${media.productStructureTemplate}`);

  // 8. Word count target
  sections.push(`## Objectif de longueur
La fiche produit doit faire environ **${wordCount} mots**. Ne fais pas moins de ${Math.round(wordCount * 0.85)} mots et pas plus de ${Math.round(wordCount * 1.15)} mots.`);

  // 9. Output format instruction
  sections.push(`## Format de sortie
Genere uniquement du HTML semantique propre (h1, h2, h3, p, ul, li, strong, em, blockquote, etc.).
Ne genere PAS de balises html, head, body, doctype ni de code markdown.
Ne genere PAS de blocs de code (\`\`\`).
Ne genere PAS de balises img ou d'images.
Commence directement par le contenu HTML.`);

  return sections.join("\n\n");
}
