import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";
import { getConfigModel } from "@/lib/config";
import { calculateCost } from "@/lib/pricing";
import { formatForbiddenWords, loadForbiddenWords } from "./enrichment-step";

export const DEFAULT_PLAN_PROMPT = `// Rôle
Vous êtes un expert en architecture éditoriale pour guides d'achat grand public, spécialisé dans la création de plans d'articles structurés pour #NomMedia. Votre expertise réside dans la conception de trames éditoriales claires, reproductibles et immédiatement exploitables par des journalistes, fondées sur le modèle marketing SAVE (Situation, Atout, Valeur, Évidence), sans rédaction finale.

// Tâche
Créer un plan d'article éditorial complet pour un guide d'achat #NomMedia en respectant une structure normalisée et reproductible pour chaque produit présenté.

// Contexte
Ce plan servira de trame de rédaction à un journaliste de #NomMedia pour la rubrique Guide d'achat. L'objectif est de faciliter la production rapide d'un article destiné à des lecteurs grand public, en s'appuyant sur des situations d'usage concrètes et des repères simples pour faire un choix éclairé, sans expertise préalable. Le plan doit intégrer une approche pédagogique orientée aide à la décision, avec un ton accessible, direct et factuel.

// Données injectées automatiquement

Mot-clé principal : #MotClePrincipal
Nombre de mots cible : #NombreMots
Critères de sélection : #Criteres

Produits sélectionnés :
#ResumeProduits

Mots-clés secondaires (format : MotClé Min Max) :
#MotsCles

// Instructions de génération

> Phase unique : Génération du plan structuré

Produire un plan respectant strictement la structure suivante :

-> Section 1 : Titre principal (H1)
- Titre : intégrant le mot-clé principal, ton clair et informatif, orienté situation d'usage.

-> Section 2 : Chapô
- Brief : Définir en 15 mots l'objectif du chapô : installer une situation familière du quotidien, montrer que le guide aide à faire un choix simple et rassurant, et inciter à découvrir la sélection, sans répéter le titre.
- Mots-clés à utiliser : liste des mots-clés à utiliser, sur une seule ligne, séparés par des virgules
- Nombre de mots : 30 maximum

-> Section 3 : Introduction
- Brief : Installer un moment de vie concret et familier où le plaisir attendu est central, puis faire comprendre que le choix du produit influence directement le confort, la simplicité et le plaisir d'usage au quotidien, ce qui justifie la sélection proposée.
- Mots-clés à utiliser : liste des mots-clés à utiliser, sur une seule ligne, séparés par des virgules
- Nombre de mots : 100 maximum
- Contraintes éditoriales :
     - ouverture impérative par une scène de vie ou un moment vécu identifiable
     - aucune description technique ni définition du produit
     - aucune reprise du chapô ni du titre
     - le guide doit se positionner comme un repère rassurant pour faire un choix simple, pas comme un comparatif

-> Section 4 : Critères de sélection (H2)
- Titre : "Ce que nous avons comparé pour repérer les meilleurs #MotClePrincipal"
- Brief : 30 mots minimum expliquant comment présenter les critères de sélection
- Mots-clés à utiliser : liste des mots clés à utiliser, sur une même ligne séparée par une virgule
- Nombre de mots : 200
- Structure : liste à puces avec nom du critère et explication sur la même ligne

-> Section 5 : Fiches produits
Pour chaque produit de la liste fournie, reproduire strictement la structure suivante, fondée sur le modèle marketing SAVE (Situation, Atout, Valeur, Évidence).

Structure obligatoire pour chaque fiche produit :

[Nom du produit] (H2)
Mini brief
→ 1 phrase (30 mots maximum) expliquant dans quelles situations courantes le produit s'utilise et à quel moment du quotidien il apporte une réponse concrète.

PARTIE 1 – Situation (sans titre visible dans le rendu)
→ Installer une scène de vie réaliste et familière dans laquelle le produit s'intègre naturellement, afin de permettre au lecteur de se projeter immédiatement.

PARTIE 2 – Atout
→ Liste à puces présentant les éléments concrets, visibles ou immédiatement perceptibles du produit qui facilitent son usage, sans jargon technique ni exhaustivité.

PARTIE 3 – Valeur
→ Expliquer ce que le produit apporte réellement au quotidien de l'utilisateur en termes de confort, de simplicité ou de plaisir, au-delà de ses caractéristiques.

PARTIE 4 – Évidence
→ Formuler un verdict d'aide au choix clair et rassurant, montrant pourquoi ce produit constitue un choix logique et cohérent dans sa catégorie, sans insister sur ses limites.

Mots-clés à utiliser (pour l'ensemble de la fiche)
→ Liste sur une seule ligne, séparée par des virgules.

Nombre de mots total pour cette fiche produit
→ [nombre global]

Prix
→ [prix en clair]

URL marchand
→ [URL complète en clair]

Pour chaque produit, toute la structure doit être fournie intégralement, sans omission.

> Règles de formatage et contraintes éditoriales
1. Ton pédagogique et accessible, phrases courtes, vocabulaire simple, aucun jargon
2. Orientation usage concret et valeur perçue, sans accentuation des limites ou réserves
3. Aucun emoji dans l'ensemble du plan
4. Aucune utilisation du mot "exigeant"
5. Aucun texte en gras ou italique dans les briefs de paragraphes
6. Répétition explicite des mots-clés selon les fréquences Min/Max fournies
7. Structure reproductible identique pour chaque fiche produit
8. URLs marchands affichées en clair, jamais en format markdown
9. Aucune section conclusion dans le plan
10. Utilisation maximale des mots-clés si pertinent, sans sur-optimisation

> Règles de production
- Ne pas rédiger des phrases de l'article final. Chaque section doit uniquement comporter : un brief, la liste des mots-clés, le nombre de mots conseillé.
- Produire le plan ENTIER en une seule fois, sans s'arrêter. Pas de plan partiel ni de fiche sans structure complète.`;

export async function generatePlan(guideId: string): Promise<void> {
  try {
    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "generating-plan", currentStep: 0 },
    });

    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      include: {
        products: {
          orderBy: { position: "asc" },
          include: { intelligence: true },
        },
        keywords: true,
        media: true,
      },
    });

    if (!guide) throw new Error("Guide introuvable");

    const model = await getConfigModel("generation");
    const forbiddenWords = await loadForbiddenWords();

    // Prompt plan obligatoirement sur le média
    const promptTemplate = guide.media?.promptPlan?.trim();
    if (!promptTemplate) {
      throw new Error("Prompt plan manquant sur le média. Configurez-le dans /medias.");
    }

    // Build product summaries
    const resumeProduits = guide.products
      .map((gp, i) => {
        const intel = gp.intelligence;
        const brand = intel.productBrand ? `${intel.productBrand} — ` : "";
        const summary = intel.positioningSummary || "(pas encore analysé)";
        const price = intel.productPrice || "prix non disponible";
        const url = `https://www.amazon.fr/dp/${intel.asin}`;
        return `${i + 1}. ${brand}${intel.productTitle || intel.asin}\n   Prix : ${price}\n   URL : ${url}\n   ${summary}`;
      })
      .join("\n");

    // Build keywords list — triés par importance (minOccurrences décroissant)
    const motsCles = [...guide.keywords]
      .sort((a, b) => b.minOccurrences - a.minOccurrences)
      .map((k) => `${k.keyword} (${k.minOccurrences}-${k.maxOccurrences}x)`)
      .join(", ");

    const avgWordCount =
      guide.wordCountMin > 0
        ? Math.round(((guide.wordCountMin + guide.wordCountMax) / 2) / 100) * 100
        : 3000;

    const prompt = promptTemplate
      .replace(/#NomMedia/g, guide.media?.name || "le média")
      .replace(/#MotClePrincipal/g, guide.title)
      .replace(/#NombreMots/g, String(avgWordCount))
      .replace(/#Criteres/g, guide.criteria || "Aucun critère spécifié")
      .replace(/#ResumeProduits/g, resumeProduits || "Aucun produit")
      .replace(/#MotsCles/g, motsCles || "Aucun mot-clé")
      .replace(/\{forbiddenWords\}/g, formatForbiddenWords(forbiddenWords));

    // Structure de sortie : depuis le média, sinon vide (pas de format imposé)
    const outputStructure = guide.media?.planOutputStructure?.trim() || "";
    const finalPrompt = outputStructure
      ? prompt + "\n\n" + outputStructure
      : prompt;

    const completion = await chatCompletion(model, [
      { role: "system", content: finalPrompt },
      { role: "user", content: "Génère le plan du guide d'achat." },
    ], { temperature: 0.7, maxTokens: 16384 });

    const rawContent = completion.content;

    // Extraire le JSON structuré
    let planJson = "";
    const jsonMatch = rawContent.match(/:::JSON_START:::([\s\S]*?):::JSON_END:::/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        planJson = JSON.stringify(parsed);
      } catch (e) {
        console.warn("Plan JSON invalide, fallback HTML seul:", e);
      }
    } else {
      console.warn("Bloc JSON non trouvé dans la réponse du plan");
    }

    // Extraire le HTML (tout avant :::JSON_START::: ou tout si pas de JSON)
    let planHtml = rawContent;
    if (jsonMatch) {
      planHtml = rawContent.substring(0, rawContent.indexOf(":::JSON_START:::"));
    }
    planHtml = planHtml.replace(/^```html\s*/i, "").replace(/\s*```$/, "").trim();

    const promptTokens = completion.promptTokens;
    const completionTokens = completion.completionTokens;
    const cost = calculateCost(model, promptTokens, completionTokens);

    await prisma.guide.update({
      where: { id: guideId },
      data: {
        planHtml,
        planJson,
        status: "plan-ready",
        currentStep: 0,
        guidePromptTokens: promptTokens,
        guideCompletionTokens: completionTokens,
        guideGenerationCost: cost,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("Erreur plan-generator:", err);
    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "error", errorMessage: message },
    });
  }
}
