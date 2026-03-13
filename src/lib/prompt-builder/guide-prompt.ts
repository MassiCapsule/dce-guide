import type { Media, ProductIntelligence } from "@prisma/client";
import type { KeywordSpec } from "@/lib/keywords/distributor";

interface GuideProduct {
  position: number;
  intelligence: ProductIntelligence;
}

function parseJson(value: string): string[] {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

/**
 * Construit le prompt pour generer le HTML global d'un guide d'achat.
 */
export function buildGuidePrompt(
  media: Media,
  products: GuideProduct[],
  keywords: KeywordSpec[],
  guideTitle: string,
  wordCount: number
): string {
  let doRules: string[] = [];
  let dontRules: string[] = [];
  try { doRules = JSON.parse(media.doRules); } catch {}
  try { dontRules = JSON.parse(media.dontRules); } catch {}

  const sections: string[] = [];

  // 1. System context
  sections.push(`Tu es un redacteur web expert en SEO et en guides d'achat e-commerce. Tu rediges en francais, avec un style engageant et professionnel. Tu produis du HTML semantique propre.`);

  // 2. Mission
  sections.push(`## Mission
Redige un guide d'achat complet intitule "${guideTitle}" qui compare ${products.length} produits. Le guide doit aider le lecteur a choisir le meilleur produit selon ses besoins.`);

  // 3. Tone and style
  sections.push(`## Ton et style
- **Media** : ${media.name}
- **Ton** : ${media.toneDescription}
- **Style d'ecriture** : ${media.writingStyle}`);

  // 4. Rules
  if (doRules.length > 0) {
    sections.push(`## Regles a suivre (DO)
${doRules.map((r) => `- ${r}`).join("\n")}`);
  }
  if (dontRules.length > 0) {
    sections.push(`## Regles a eviter (DON'T)
${dontRules.map((r) => `- ${r}`).join("\n")}`);
  }

  // 5. Products summary
  const productSections = products
    .sort((a, b) => a.position - b.position)
    .map((p) => {
      const intel = p.intelligence;
      const strengths = parseJson(intel.strengthPoints).slice(0, 3);
      const weaknesses = parseJson(intel.weaknessPoints).slice(0, 3);
      const positioning = intel.positioningSummary || "Non disponible";

      return `### Produit ${p.position} : ${intel.productTitle}
- **Marque** : ${intel.productBrand}
- **Prix** : ${intel.productPrice}
- **Positionnement** : ${positioning}
- **Score sentiment** : ${Math.round(intel.sentimentScore * 100)}%
- **Points forts** : ${strengths.length > 0 ? strengths.join(" ; ") : "N/A"}
- **Points faibles** : ${weaknesses.length > 0 ? weaknesses.join(" ; ") : "N/A"}`;
    })
    .join("\n\n");

  sections.push(`## Produits a comparer

${productSections}`);

  // 6. SEO Keywords
  if (keywords.length > 0) {
    sections.push(`## Mots-cles SEO a integrer
Integre les mots-cles suivants dans le guide avec le nombre d'occurrences cible :
${keywords.map((k) => `- "${k.keyword}" : entre ${k.minOccurrences} et ${k.maxOccurrences} occurrences`).join("\n")}
Repartis-les naturellement dans les titres et le corps du texte. Ne fais pas de bourrage de mots-cles.`);
  }

  // 7. Structure
  sections.push(`## Structure du guide
Le guide doit contenir :
1. **Introduction** (contexte, pourquoi ce guide, a qui il s'adresse)
2. **Tableau comparatif** (tableau HTML avec les criteres cles de chaque produit)
3. **Analyse detaillee de chaque produit** (une section H2 par produit avec forces, faiblesses, pour qui)
4. **Criteres de choix** (comment choisir, les points a regarder)
5. **Conclusion / Recommandation** (quel produit pour quel profil d'acheteur)`);

  // 8. Word count
  sections.push(`## Objectif de longueur
Le guide doit faire environ **${wordCount} mots**. Ne fais pas moins de ${Math.round(wordCount * 0.85)} mots et pas plus de ${Math.round(wordCount * 1.15)} mots.`);

  // 9. Output format
  sections.push(`## Format de sortie
Genere uniquement du HTML semantique propre (h1, h2, h3, p, ul, li, strong, em, blockquote, table, thead, tbody, tr, th, td, etc.).
Ne genere PAS de balises html, head, body, doctype ni de code markdown.
Ne genere PAS de blocs de code (\`\`\`).
Ne genere PAS de balises img ou d'images.
Commence directement par le contenu HTML avec un H1 pour le titre du guide.`);

  return sections.join("\n\n");
}
