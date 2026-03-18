# Playground Plan Mode — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Plan" tab to the Playground page that lets the user build and test the plan generation prompt for a given guide.

**Architecture:** New API route `POST /api/playground/build-plan-prompt` builds an annotated prompt (segments with badges) from guide data + media's plan prompt template. New route `POST /api/playground/generate-plan` sends the prompt to the AI with a plan-specific user message. Frontend adds a TabsList wrapping existing "Fiche produit" content + new "Plan" tab.

**Tech Stack:** Next.js API routes, Prisma, existing `chatCompletion`, existing `PromptSegment` type from `annotated.ts`.

---

### Task 1: Create plan prompt annotated builder

**Files:**
- Create: `src/lib/prompt-builder/plan-annotated.ts`

**Step 1: Create the builder function**

This function takes a plan prompt template (with `#Placeholder` syntax) and guide data, and returns annotated segments (same format as `annotated.ts` but for `#` placeholders).

```ts
import type { PromptSegment, AnnotatedPrompt } from "./annotated";

interface PlanPromptData {
  mediaName: string;
  motClePrincipal: string;
  nombreMots: number;
  criteres: string;
  resumeProduits: string;
  motsCles: string;
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
  };

  // Build regex matching all #Placeholders
  const placeholderRegex = /#(NomMedia|MotClePrincipal|NombreMots|Criteres|ResumeProduits|MotsCles)/g;

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
```

**Step 2: Commit**

```bash
git add src/lib/prompt-builder/plan-annotated.ts
git commit -m "feat: add plan prompt annotated builder for playground"
```

---

### Task 2: Create API route `POST /api/playground/build-plan-prompt`

**Files:**
- Create: `src/app/api/playground/build-plan-prompt/route.ts`

**Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfigModel } from "@/lib/config";
import { DEFAULT_PLAN_PROMPT } from "@/lib/guide/plan-generator";
import { buildPlanAnnotated } from "@/lib/prompt-builder/plan-annotated";

export async function POST(req: NextRequest) {
  try {
    const { guideId } = await req.json();

    if (!guideId) {
      return NextResponse.json({ error: "guideId est requis" }, { status: 400 });
    }

    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      include: {
        products: {
          orderBy: { position: "asc" },
          include: { intelligence: true },
        },
        keywords: { orderBy: { id: "asc" } },
        media: true,
      },
    });

    if (!guide) {
      return NextResponse.json({ error: "Guide introuvable" }, { status: 404 });
    }

    // Build product summaries (same logic as plan-generator.ts)
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

    // Build keywords list (top 30)
    const motsCles = guide.keywords
      .slice(0, 30)
      .map((k) => `${k.keyword} (${k.minOccurrences}-${k.maxOccurrences}x)`)
      .join(", ");

    // Average word count
    const avgWordCount =
      guide.wordCountMin > 0
        ? Math.round(((guide.wordCountMin + guide.wordCountMax) / 2) / 100) * 100
        : 3000;

    // Resolve prompt template: media.promptPlan > DEFAULT_PLAN_PROMPT
    const promptTemplate = guide.media?.promptPlan?.trim() || DEFAULT_PLAN_PROMPT;

    // Resolve model: media.modelPlan > global model_plan
    const modelPlan = guide.media?.modelPlan?.trim() || await getConfigModel("plan");

    const result = buildPlanAnnotated(promptTemplate, {
      mediaName: guide.media?.name || "le média",
      motClePrincipal: guide.title,
      nombreMots: avgWordCount,
      criteres: guide.criteria || "Aucun critère spécifié",
      resumeProduits: resumeProduits || "Aucun produit",
      motsCles: motsCles || "Aucun mot-clé",
    });

    return NextResponse.json({
      ...result,
      mediaName: guide.media?.name || "",
      modelPlan,
    });
  } catch (error) {
    console.error("Erreur build-plan-prompt:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { error: `Erreur lors de la construction du prompt plan : ${message}` },
      { status: 500 }
    );
  }
}
```

**Step 2: Export `DEFAULT_PLAN_PROMPT` from plan-generator.ts**

In `src/lib/guide/plan-generator.ts`, the `DEFAULT_PLAN_PROMPT` is already exported. Verify this — it should be `export const DEFAULT_PLAN_PROMPT = ...`.

**Step 3: Commit**

```bash
git add src/app/api/playground/build-plan-prompt/route.ts
git commit -m "feat: add build-plan-prompt API route for playground"
```

---

### Task 3: Create API route `POST /api/playground/generate-plan`

**Files:**
- Create: `src/app/api/playground/generate-plan/route.ts`

**Step 1: Create the route**

Same as existing `generate` route but with plan-specific user message and higher maxTokens (8192 like plan-generator).

```ts
import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai-client";

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json();

    if (!prompt || !model) {
      return NextResponse.json(
        { error: "prompt et model sont requis" },
        { status: 400 }
      );
    }

    const result = await chatCompletion(model, [
      { role: "system", content: prompt },
      { role: "user", content: "Génère le plan du guide d'achat." },
    ], {
      temperature: 0.7,
      maxTokens: 8192,
    });

    // Clean markdown fences
    const html = result.content.replace(/^```html\s*/i, "").replace(/\s*```$/, "").trim();

    return NextResponse.json({
      html,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    });
  } catch (error) {
    console.error("Erreur generate-plan:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du plan" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/playground/generate-plan/route.ts
git commit -m "feat: add generate-plan API route for playground"
```

---

### Task 4: Refactor Playground page — add TabsList wrapper + Plan tab

**Files:**
- Modify: `src/app/playground/page.tsx`

**Step 1: Refactor the page**

Wrap existing content in a top-level `Tabs` with 2 tabs: "Fiche produit" (existing code) and "Plan" (new).

Key changes:
1. Header title becomes "Playground" (remove "— Prompt Fiche Produit")
2. Add a `Tabs`/`TabsList` right after header with `defaultValue="fiche"`
3. Existing code goes inside `TabsContent value="fiche"`
4. New Plan tab goes inside `TabsContent value="plan"`

Plan tab states:
- `planGuideId` — string input
- `planModel` — string (pre-filled from API response)
- `planMediaName` — string (display only, from API)
- `planSegments` — PromptSegment[]
- `planFullPrompt` — string
- `planGeneratedHtml` — string
- `planTokenInfo` — { promptTokens, completionTokens } | null
- `planLoadingPrompt` — boolean
- `planLoadingGenerate` — boolean
- `planError` — string

Plan tab UI structure:
- Card "Paramètres" : ID Guide input + Modèle IA select + nom média (affiché après chargement) + bouton "Charger le prompt"
- Card "Prompt" (conditionally shown) : annotated prompt with badges + bouton "Générer"
- Card "Résultat" (conditionally shown) : Preview/Code source tabs + tokens

**Step 2: Commit**

```bash
git add src/app/playground/page.tsx
git commit -m "feat: playground plan mode — tabs, build prompt, generate plan"
```

---

### Task 5: Verify everything works

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Manual test**

1. Go to `/playground`
2. Check that "Fiche produit" tab works as before
3. Switch to "Plan" tab
4. Enter a guide ID, click "Charger le prompt"
5. Verify prompt appears with badges
6. Verify model is pre-selected
7. Verify media name is displayed
8. Click "Générer"
9. Verify plan HTML appears in Preview/Code source

**Step 3: Final commit if any fixes needed**
