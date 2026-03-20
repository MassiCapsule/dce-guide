# Article Enrichment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrichir la génération d'article avec chapô, introduction, sommaire, FAQ, et meta fields pré-remplis par IA.

**Architecture:** Pipeline étendu dans `article-generator.ts` : après les fiches produits, un résumé IA est généré, puis 4 appels parallèles produisent les éléments complémentaires. Chaque élément est stocké séparément en DB. L'assemblage final crée le `guideHtml` complet. Les MetaFields sont pré-remplis et persistés.

**Tech Stack:** Next.js 14, Prisma/SQLite, OpenAI/Anthropic via `ai-client.ts`, shadcn/ui

---

## Task 1: Migration Prisma — Nouveaux champs Guide

**Files:**
- Modify: `prisma/schema.prisma` (modèle Guide, après `guideHtmlV2`)

**Step 1: Ajouter les champs au schéma Prisma**

Dans `prisma/schema.prisma`, ajouter après `guideHtmlV2` :

```prisma
  articleSummary        String @default("")
  chapoHtml             String @default("")
  sommaireHtml          String @default("")
  faqHtml               String @default("")
  metaTitle             String @default("")
  metaDescription       String @default("")
  imageCaption          String @default("")
  slug                  String @default("")
```

**Step 2: Lancer la migration**

```bash
npx prisma migrate dev --name add-article-enrichment-fields
```

Si erreur EPERM sur le DLL, arrêter le serveur dev d'abord :
```bash
taskkill //F //IM node.exe
npx prisma generate
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add article enrichment fields to Guide model"
```

---

## Task 2: Prompts par défaut — Constantes hardcodées

**Files:**
- Modify: `src/app/api/config/prompts/route.ts`

**Step 1: Ajouter les 5 constantes de prompts**

Ajouter avant le handler GET, après `HUMANISER_PROMPT` :

```typescript
export const RESUME_PROMPT = `Résume cet article de guide d'achat en 200 mots maximum. Le résumé doit capturer : le sujet principal, les produits présentés (noms et positionnement), les critères de choix, et la promesse éditoriale. Style factuel et synthétique.

Article :
{article}`;

export const CHAPO_PROMPT = `Tu es un rédacteur web expert en journalisme éditorial pour {media.name}.
Ton : {media.toneDescription}
Style : {media.writingStyle}
Mots interdits :
{forbiddenWords}

Ta tâche est de rédiger un chapô de 30 mots suivi d'une introduction de 100 mots qui forment ensemble un bloc d'entrée cohérent et complémentaire — sans jamais se répéter.

Chapô (30 mots exactement)
Pose le sujet de façon dense et synthétique en couvrant : le thème central, le périmètre traité et l'angle éditorial. Contraintes strictes : aucune question, aucun chiffre de prix, aucun exemple de produit spécifique.

Introduction (100 mots exactement)
Structure le texte en suivant les 5W dans cet ordre précis :
- Qui — le lecteur cible, celui qui est directement concerné par le sujet
- Quoi — le problème concret ou le besoin réel qu'il rencontre
- Où — le contexte d'usage : lieu, situation, environnement
- Quand — la fréquence ou le moment déclencheur
- Pourquoi — ce que ce contenu lui apporte concrètement

L'introduction ne reformule pas le chapô. Elle développe, contextualise et crée l'envie de lire la suite. Les deux blocs se complètent : le chapô cadre, l'introduction engage.

Ton et style : direct, concret et utile. Pas de superlatifs, pas de formules creuses. Chaque phrase doit apporter une information ou créer une attente chez le lecteur.

Le résultat final est un bloc continu et cohérent — pas deux résumés du même contenu.

Mot-clé principal : {keyword}

Résumé de l'article :
{resume}`;

export const SOMMAIRE_PROMPT = `::: Contexte :::
Vous êtes un rédacteur expert spécialisé dans la création de guides d'achat pour {media.name}.
Ton : {media.toneDescription}
Style : {media.writingStyle}
Mots interdits :
{forbiddenWords}

::: Mission :::
Transformer une liste de produits fournie par l'utilisateur en une sélection éditoriale formatée selon des règles précises de présentation.

La sélection doit commencer par un titre H2 personnalisé, suivie d'une liste à puces où chaque produit apparaît sur UNE SEULE LIGNE COMPLÈTE (tiret, nom en gras, deux-points, description, URL), puis se terminer par 10 propositions de titres H2 alternatifs pour introduire cette même sélection dans différents contextes éditoriaux.

::: Structure du sommaire :::

> Structure exacte à respecter pour chaque sélection :

1. Titre principal au format : "Notre sélection de #NomduProduit pour #promesse" (en H2)

2. Liste à puces avec pour chaque produit :
   - **Nom du produit** (en gras uniquement) : description complète en une phrase URL complète en clair qui commence par un qualificatif

> Contraintes à respecter
- Aucun retour à la ligne ne doit séparer ces trois éléments : Nom du produit, description et url
- Majuscule uniquement en début de phrase et sur les noms propres
- Une description de moins de 15 mots

::: Structure des H2 :::

Proposer 10 titres H2 alternatifs :
- Tous distincts et originaux
- Variés dans leur approche (bénéfice, nombre, émotion, besoin)
- Clairs et incitatifs
- Reflétant des besoins ou envies concrètes du lecteur

> Ton et style éditorial :
- Accessible et compréhensible par tous
- Concret avec des bénéfices tangibles
- Orienté vers l'utilisation réelle au quotidien
- Éviter le jargon technique excessif
- Privilégier les formulations qui parlent au lecteur

Mot-clé principal : {keyword}

Résumé de l'article :
{resume}`;

export const FAQ_PROMPT = `Tu es un rédacteur expert pour {media.name}.
Ton : {media.toneDescription}
Style : {media.writingStyle}
Mots interdits :
{forbiddenWords}

Génère une FAQ de 5 questions qui respectent ces règles :

0. La FAQ doit être utile aux lecteurs de cet article
1. Question posée comme si on était sur Google ou un LLM (en gras balisé en H3)
2. Réponses de 35 mots sans gras
3. Classé les questions du global au particulier
4. Pas de numéro ni emoji devant les questions en gras

Mot-clé principal : {keyword}

Résumé de l'article :
{resume}`;

export const META_PROMPT = `Tu es un rédacteur SEO expert pour {media.name}.
Ton : {media.toneDescription}
Style : {media.writingStyle}
Mots interdits :
{forbiddenWords}

Génère les éléments suivants basés sur l'ensemble du contenu fourni :

1. Un slug URL (minuscules, tirets, sans accents, 3-5 mots)
2. Un méta title (question, 55-60 caractères espaces inclus)
3. Une méta description (réponse directe, 150-160 caractères espaces inclus)
4. Une légende photo courte qui apporte une info complémentaire à l'article

Compte chaque caractère manuellement. Format attendu :

Slug : [texte]
Méta Title (X caractères) : [texte]
Méta Description (X caractères) : [texte]
Légende : [texte]

Mot-clé principal : {keyword}

Résumé de l'article :
{resume}`;
```

**Step 2: Mettre à jour le handler GET pour retourner les nouveaux prompts**

Dans la fonction GET du même fichier, ajouter les 5 nouveaux prompts à l'objet retourné :

```typescript
return NextResponse.json({
  analysis: ANALYSIS_PROMPT,
  generation: GENERATION_PROMPT,
  criteres: CRITERES_PROMPT,
  humaniser: HUMANISER_PROMPT,
  plan: DEFAULT_PLAN_PROMPT,
  // Nouveaux prompts
  resume: RESUME_PROMPT,
  chapo: CHAPO_PROMPT,
  sommaire: SOMMAIRE_PROMPT,
  faq: FAQ_PROMPT,
  meta: META_PROMPT,
});
```

**Step 3: Commit**

```bash
git add src/app/api/config/prompts/route.ts
git commit -m "feat: add 5 default prompts for article enrichment"
```

---

## Task 3: Page Paramètres — 5 nouveaux sous-onglets

**Files:**
- Modify: `src/app/parametres/page.tsx`

**Step 1: Ajouter les 5 nouveaux onglets dans le tableau PROMPT_TABS**

Trouver le tableau `PROMPT_TABS` (ou équivalent) et ajouter entre "Generation" et "Humaniser" :

```typescript
{ key: "prompt_resume", label: "Résumé", configKey: "prompt_resume", hasModel: false },
{ key: "prompt_chapo", label: "Chapô + Intro", configKey: "prompt_chapo", hasModel: false },
{ key: "prompt_sommaire", label: "Sommaire", configKey: "prompt_sommaire", hasModel: false },
{ key: "prompt_faq", label: "FAQ", configKey: "prompt_faq", hasModel: false },
{ key: "prompt_meta", label: "Méta + Slug", configKey: "prompt_meta", hasModel: false },
```

**Step 2: Mettre à jour le chargement des prompts par défaut**

S'assurer que le fallback pour chaque nouveau prompt lit bien la clé correspondante depuis `/api/config/prompts` : `resume`, `chapo`, `sommaire`, `faq`, `meta`.

**Step 3: Vérifier que la sauvegarde fonctionne**

La sauvegarde existante boucle sur tous les prompts et les envoie à `POST /api/config`. Vérifier que les 5 nouvelles clés sont incluses.

**Step 4: Commit**

```bash
git add src/app/parametres/page.tsx
git commit -m "feat: add 5 enrichment prompt tabs in settings page"
```

---

## Task 4: Service d'enrichissement — `enrichment-step.ts`

**Files:**
- Create: `src/lib/guide/enrichment-step.ts`

**Step 1: Créer le service d'enrichissement**

Ce fichier contient :
- `generateSummary(guideId, articleHtml)` — appel IA pour le résumé
- `generateEnrichments(guideId, summary)` — 4 appels parallèles
- `parseMetaResponse(text)` — parse la réponse méta en {slug, metaTitle, metaDescription, imageCaption}

```typescript
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai-client";
import { getConfigModel } from "@/lib/config";
import { calculateCost } from "@/lib/pricing";
import {
  RESUME_PROMPT,
  CHAPO_PROMPT,
  SOMMAIRE_PROMPT,
  FAQ_PROMPT,
  META_PROMPT,
} from "@/app/api/config/prompts/route";

/** Résout les placeholders média communs dans un prompt */
function resolveMediaPlaceholders(
  prompt: string,
  media: { name: string; toneDescription: string; writingStyle: string; forbiddenWords: string },
  keyword: string,
  resume: string
): string {
  const bullet = (s: string) => (s.startsWith("- ") ? s : `- ${s}`);
  let forbiddenWords: string[] = [];
  try { forbiddenWords = JSON.parse(media.forbiddenWords); } catch { forbiddenWords = []; }

  return prompt
    .replace(/\{media\.name\}/g, media.name || "")
    .replace(/\{media\.toneDescription\}/g, media.toneDescription || "")
    .replace(/\{media\.writingStyle\}/g, media.writingStyle || "")
    .replace(/\{forbiddenWords\}/g, forbiddenWords.map(bullet).join("\n"))
    .replace(/\{keyword\}/g, keyword)
    .replace(/\{resume\}/g, resume);
}

/** Parse la réponse du prompt méta en champs structurés */
function parseMetaResponse(text: string): {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  imageCaption: string;
} {
  const slugMatch = text.match(/Slug\s*:\s*(.+)/i);
  const titleMatch = text.match(/M[ée]ta Title\s*\([^)]*\)\s*:\s*(.+)/i);
  const descMatch = text.match(/M[ée]ta Description\s*\([^)]*\)\s*:\s*(.+)/i);
  const legendMatch = text.match(/L[ée]gende\s*:\s*(.+)/i);

  return {
    slug: slugMatch?.[1]?.trim() || "",
    metaTitle: titleMatch?.[1]?.trim() || "",
    metaDescription: descMatch?.[1]?.trim() || "",
    imageCaption: legendMatch?.[1]?.trim() || "",
  };
}

/** Charge un prompt depuis AppConfig avec fallback */
async function loadPrompt(key: string, fallback: string): Promise<string> {
  const config = await prisma.appConfig.findUnique({ where: { key } });
  return config?.value || fallback;
}

/** Étape résumé : génère le résumé de l'article */
export async function generateSummary(
  articleHtml: string,
  model: string
): Promise<{ summary: string; cost: number }> {
  const promptTemplate = await loadPrompt("prompt_resume", RESUME_PROMPT);
  const prompt = promptTemplate.replace(/\{article\}/g, articleHtml);

  const result = await chatCompletion(model, [
    { role: "system", content: prompt },
    { role: "user", content: "Résume cet article." },
  ], { temperature: 0.7, maxTokens: 1024 });

  const cost = calculateCost(model, result.promptTokens, result.completionTokens);
  return { summary: result.content.trim(), cost };
}

/** Étape enrichissement : 4 appels parallèles */
export async function generateEnrichments(
  guideId: string,
  summary: string,
  media: { name: string; toneDescription: string; writingStyle: string; forbiddenWords: string },
  keyword: string,
  model: string
): Promise<{ totalCost: number }> {
  // Charger les 4 prompts en parallèle
  const [chapoTemplate, sommaireTemplate, faqTemplate, metaTemplate] = await Promise.all([
    loadPrompt("prompt_chapo", CHAPO_PROMPT),
    loadPrompt("prompt_sommaire", SOMMAIRE_PROMPT),
    loadPrompt("prompt_faq", FAQ_PROMPT),
    loadPrompt("prompt_meta", META_PROMPT),
  ]);

  // Résoudre les placeholders
  const chapoPrompt = resolveMediaPlaceholders(chapoTemplate, media, keyword, summary);
  const sommairePrompt = resolveMediaPlaceholders(sommaireTemplate, media, keyword, summary);
  const faqPrompt = resolveMediaPlaceholders(faqTemplate, media, keyword, summary);
  const metaPrompt = resolveMediaPlaceholders(metaTemplate, media, keyword, summary);

  // 4 appels en parallèle
  const results = await Promise.allSettled([
    chatCompletion(model, [
      { role: "system", content: chapoPrompt },
      { role: "user", content: "Rédige le chapô et l'introduction." },
    ], { temperature: 0.7, maxTokens: 1024 }),
    chatCompletion(model, [
      { role: "system", content: sommairePrompt },
      { role: "user", content: "Génère le sommaire / sélection produits." },
    ], { temperature: 0.7, maxTokens: 2048 }),
    chatCompletion(model, [
      { role: "system", content: faqPrompt },
      { role: "user", content: "Génère la FAQ." },
    ], { temperature: 0.7, maxTokens: 2048 }),
    chatCompletion(model, [
      { role: "system", content: metaPrompt },
      { role: "user", content: "Génère le slug, meta title, meta description et légende." },
    ], { temperature: 0.7, maxTokens: 512 }),
  ]);

  let totalCost = 0;
  const cleanMarkdown = (s: string) => s.replace(/^```html\s*/i, "").replace(/```\s*$/, "").trim();

  // Extraire les résultats (fulfilled ou vide si rejected)
  const chapoResult = results[0].status === "fulfilled" ? results[0].value : null;
  const sommaireResult = results[1].status === "fulfilled" ? results[1].value : null;
  const faqResult = results[2].status === "fulfilled" ? results[2].value : null;
  const metaResult = results[3].status === "fulfilled" ? results[3].value : null;

  const data: Record<string, unknown> = {};

  if (chapoResult) {
    data.chapoHtml = cleanMarkdown(chapoResult.content);
    totalCost += calculateCost(model, chapoResult.promptTokens, chapoResult.completionTokens);
  }
  if (sommaireResult) {
    data.sommaireHtml = cleanMarkdown(sommaireResult.content);
    totalCost += calculateCost(model, sommaireResult.promptTokens, sommaireResult.completionTokens);
  }
  if (faqResult) {
    data.faqHtml = cleanMarkdown(faqResult.content);
    totalCost += calculateCost(model, faqResult.promptTokens, faqResult.completionTokens);
  }
  if (metaResult) {
    const parsed = parseMetaResponse(metaResult.content);
    data.slug = parsed.slug;
    data.metaTitle = parsed.metaTitle;
    data.metaDescription = parsed.metaDescription;
    data.imageCaption = parsed.imageCaption;
    totalCost += calculateCost(model, metaResult.promptTokens, metaResult.completionTokens);
  }

  // Sauvegarder tous les résultats en une seule écriture
  await prisma.guide.update({
    where: { id: guideId },
    data,
  });

  return { totalCost };
}
```

**Step 2: Commit**

```bash
git add src/lib/guide/enrichment-step.ts
git commit -m "feat: enrichment service — summary, chapô, sommaire, FAQ, meta"
```

---

## Task 5: Étendre `article-generator.ts` — Pipeline complet

**Files:**
- Modify: `src/lib/guide/article-generator.ts`

**Step 1: Importer les fonctions d'enrichissement**

```typescript
import { generateSummary, generateEnrichments } from "./enrichment-step";
```

**Step 2: Ajouter les étapes après l'assemblage des fiches**

Après la boucle `for` qui génère les fiches (après `htmlParts.push(cleaned)`) et avant le `prisma.guide.update` final, insérer :

```typescript
    // --- RÉSUMÉ ---
    const bodyHtml = htmlParts.join("\n\n");

    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "summarizing", currentStep: 0 },
    });

    const { summary, cost: summaryCost } = await generateSummary(bodyHtml, model);
    totalCost += summaryCost;

    await prisma.guide.update({
      where: { id: guideId },
      data: { articleSummary: summary },
    });

    // --- ENRICHISSEMENTS (4 appels parallèles) ---
    await prisma.guide.update({
      where: { id: guideId },
      data: { status: "enriching", currentStep: 0 },
    });

    const { totalCost: enrichCost } = await generateEnrichments(
      guideId, summary, guide.media, guide.title, model
    );
    totalCost += enrichCost;

    // --- ASSEMBLAGE FINAL ---
    // Recharger le guide pour avoir les résultats d'enrichissement
    const enriched = await prisma.guide.findUnique({
      where: { id: guideId },
      select: { chapoHtml: true, sommaireHtml: true, faqHtml: true },
    });

    const guideHtml = [
      enriched?.chapoHtml,
      enriched?.sommaireHtml,
      bodyHtml,
      enriched?.faqHtml,
    ].filter(Boolean).join("\n\n");
```

**Step 3: Mettre à jour l'update final**

Remplacer l'ancien `prisma.guide.update` final pour sauvegarder le `guideHtml` assemblé :

```typescript
    const guideWordCount = countWords(guideHtml);

    await prisma.guide.update({
      where: { id: guideId },
      data: {
        guideHtml,
        guideWordCount,
        status: "complete",
        currentStep: 0,
        totalCost,
      },
    });
```

**Step 4: Commit**

```bash
git add src/lib/guide/article-generator.ts
git commit -m "feat: extend article pipeline — summary, enrichments, final assembly"
```

---

## Task 6: PATCH route — Persister les MetaFields

**Files:**
- Modify: `src/app/api/guides/[id]/route.ts`

**Step 1: Étendre le handler PATCH**

Ajouter les nouveaux champs acceptés dans le PATCH handler :

```typescript
if (body.slug !== undefined) data.slug = body.slug;
if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle;
if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription;
if (body.imageCaption !== undefined) data.imageCaption = body.imageCaption;
```

**Step 2: Commit**

```bash
git add src/app/api/guides/[id]/route.ts
git commit -m "feat: PATCH route accepts slug, metaTitle, metaDescription, imageCaption"
```

---

## Task 7: Tab Article — Progression enrichie + MetaFields connectés

**Files:**
- Modify: `src/components/guides/tabs/tab-article.tsx`

**Step 1: Mettre à jour la progression**

Ajouter les nouveaux statuts dans `getProgressPercent()` et `getProgressLabel()` :

```typescript
function getProgressPercent(): number {
  if (phase === "distributing") return 5;
  if (phase === "generating" && totalProducts > 0) {
    return 5 + Math.round((currentStep / totalProducts) * 55);
  }
  if (phase === "summarizing") return 65;
  if (phase === "enriching") return 85;
  if (phase === "complete") return 100;
  return 0;
}

function getProgressLabel(): string {
  if (phase === "distributing") return "Distribution des mots-clés...";
  if (phase === "generating" && totalProducts > 0) {
    return `Génération fiche ${currentStep}/${totalProducts}...`;
  }
  if (phase === "summarizing") return "Résumé de l'article...";
  if (phase === "enriching") return "Génération des éléments (chapô, sommaire, FAQ, méta)...";
  return "";
}
```

Mettre à jour le type `GenerationPhase` :

```typescript
type GenerationPhase = "idle" | "distributing" | "generating" | "summarizing" | "enriching" | "complete";
```

Et dans le polling, ajouter les cas :

```typescript
} else if (data.status === "summarizing") {
  setPhase("summarizing");
} else if (data.status === "enriching") {
  setPhase("enriching");
}
```

**Step 2: Charger et pré-remplir les MetaFields depuis le guide**

Le composant TabArticle reçoit déjà un prop `meta`. Mettre à jour la page `guides/[id]/page.tsx` pour passer les vrais champs du guide :

```typescript
meta={{
  slug: guide.slug || "",
  metaTitle: guide.metaTitle || "",
  metaDescription: guide.metaDescription || "",
  imageCaption: guide.imageCaption || "",
}}
```

**Step 3: Ajouter un bouton "Sauvegarder" pour les MetaFields**

Dans TabArticle, ajouter un handler qui fait `PATCH /api/guides/[id]` avec les 4 champs méta, et un bouton "Sauvegarder les éléments SEO" dans le collapsible.

**Step 4: Mettre à jour le sync des MetaFields après génération**

Dans le polling, quand `status === "complete"`, recharger aussi les meta fields :

```typescript
if (guideRes.ok) {
  const guide = await guideRes.json();
  setHtml(guide.guideHtml || "");
  setMeta({
    slug: guide.slug || "",
    metaTitle: guide.metaTitle || "",
    metaDescription: guide.metaDescription || "",
    imageCaption: guide.imageCaption || "",
  });
}
```

**Step 5: Commit**

```bash
git add src/components/guides/tabs/tab-article.tsx src/app/guides/[id]/page.tsx
git commit -m "feat: enriched progress bar, MetaFields auto-filled and saved"
```

---

## Task 8: Page guide — Interface Guide avec nouveaux champs

**Files:**
- Modify: `src/app/guides/[id]/page.tsx`

**Step 1: Ajouter les champs au type Guide**

```typescript
interface Guide {
  // ... champs existants
  slug: string;
  metaTitle: string;
  metaDescription: string;
  imageCaption: string;
  articleSummary: string;
  chapoHtml: string;
  sommaireHtml: string;
  faqHtml: string;
}
```

**Step 2: Passer les meta au TabArticle et TabArticleV2**

Mettre à jour les deux TabsContent pour passer les vrais champs :

```typescript
meta={{
  slug: guide.slug || "",
  metaTitle: guide.metaTitle || "",
  metaDescription: guide.metaDescription || "",
  imageCaption: guide.imageCaption || "",
}}
```

**Step 3: Commit**

```bash
git add src/app/guides/[id]/page.tsx
git commit -m "feat: pass real meta fields from Guide to Article tabs"
```

---

## Task 9: CLAUDE.md — Mise à jour documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Mettre à jour les sections**

- Champs Guide importants : ajouter `articleSummary`, `chapoHtml`, `sommaireHtml`, `faqHtml`, `metaTitle`, `metaDescription`, `imageCaption`, `slug`
- Status : ajouter `summarizing`, `enriching` dans la chaîne
- AppConfig : ajouter les 5 nouvelles clés `prompt_resume`, `prompt_chapo`, `prompt_sommaire`, `prompt_faq`, `prompt_meta`
- Lib/Services : ajouter `enrichment-step.ts`
- Workflow : mettre à jour l'étape 4 (Article) pour décrire le pipeline enrichi
- Paramètres : lister les 9 sous-onglets prompts
- Historique des features : ajouter les entrées du 2026-03-20

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with article enrichment pipeline"
```

---

## Task 10: Commit final + Push

**Step 1: Vérifier que tout compile**

```bash
npx tsc --noEmit --pretty 2>&1 | grep -v ".next/types"
```

**Step 2: Push**

```bash
git push
```
