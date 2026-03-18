# Playground Humaniser Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter un bouton "Humaniser" dans le Playground qui charge un prompt éditable, puis génère une V2 humanisée de la fiche produit.

**Architecture:** Nouveau sous-onglet "Humaniser" dans Paramètres (clé `prompt_humaniser` en AppConfig). Route API `build-humanize-prompt` qui résout les placeholders média + injecte le HTML V1. Le Playground affiche 3 sections : Résultat V1, Prompt Humaniser (éditable), Résultat V2.

**Tech Stack:** Next.js API routes, AppConfig (Prisma), React state

---

### Task 1: Ajouter le prompt par défaut dans l'API config/prompts

**Files:**
- Modify: `src/app/api/config/prompts/route.ts`

**Step 1: Ajouter la constante HUMANISER_PROMPT**

Ajouter après `CRITERES_PROMPT` :

```typescript
const HUMANISER_PROMPT = `::: Role :::
Tu es un rédacteur humain expert en contenu e-commerce pour La Provence. Réécris le texte fourni pour éliminer tous les tics d'écriture IA tout en conservant la structure HTML, les balises et l'ordre des blocs. Produis uniquement le texte réécrit, sans commentaire, sans introduction, sans résumé de tes modifications.

::: Ton à respecter :::
{media.toneDescription}

::: Style d'écriture à respecter  :::
{media.writingStyle}

::: Tâche 1 : Structure — règles de construction :::
- Méfie-toi des listes de trois éléments dans les paragraphes de prose : utilise deux éléments, ou quatre et plus
- Pas de parallélismes négatifs : "Ce n'est pas seulement X, c'est aussi Y" → énonce le point directement
- Alterne les longueurs de phrases. Une phrase longue et dense, suivie d'une phrase courte. Ça change le rythme.
- Ne pas commencer deux paragraphes consécutifs par le même mot ou la même structure
- Ne pas répéter le nom du produit plus de deux fois dans le même paragraphe

::: Tâche 2 : Vocabulaire interdit — supprime et remplace :::
- Mots isolés : crucial, exhaustif, incontournable, indispensable, myriade, indélébile, multifacette, porteur de sens, riche (au sens figuré)
- Connecteurs IA : de plus, en outre, par ailleurs, à cet égard, dans ce contexte, au fil du temps, à l'heure actuelle, néanmoins (en ouverture de phrase)
- Tournures d'emphase creuse : il convient de noter, il est important de souligner, force est de constater, nul doute que, il va sans dire, en conclusion, en somme
- Verbes d'emphase produit : transforme, révolutionne, sublime, optimise (en suremploi), s'impose, éliminent, simplifie (en suremploi)
- Verbes de mise en valeur : mettre en lumière, mettre en exergue, témoigner de, incarner, symboliser, refléter, s'inscrire dans, souligner (en suremploi)
- Copules à remplacer par "est" ou "a" : sert de, fait office de, représente, incarne, marque un virage vers
- Vocabulaire promotionnel e-commerce : niché au cœur de, aux multiples facettes, un tournant décisif, une dynamique nouvelle, allié fiable, partenaire du quotidien, solution idéale, répond parfaitement à vos besoins
- Intensificateurs vagues : vrai, réel, concret, complet, convaincant, rassurant (utilisés comme intensificateurs)

::: Tâche 3 : Patterns de contenu — corrige systématiquement :::
- Inflation de la signification → remplace par le fait technique ou l'usage concret
- Analyses en participe présent sans source ("reflétant…, optimisant…") → reformule en phrase affirmative directe
- Surhedging → "pourrait potentiellement peut-être" → "peut"
- Remplissage → "Afin de" → "Pour" / "En raison du fait que" → "Car"
- Conclusions génériques ("un choix qui ne vous décevra pas", "pour une expérience optimale") → supprime ou remplace par un fait produit
- Promesses sans preuve ("performances exceptionnelles", "qualité irréprochable") → remplace par la caractéristique technique qui justifie l'affirmation

::: Tâche 4 : Mise en forme — règles techniques :::
- Conserver toutes les balises HTML telles quelles : h1, h2, p, ul, li, strong, em
- Ne pas ajouter, supprimer ni modifier les balises HTML
- Titres en casse de phrase : "L'aspirateur sans fil qui se vide seul" et non "L'Aspirateur Sans Fil Qui Se Vide Seul"
- Tiret long (—) : remplace par une virgule ou un point, sauf usage stylistique délibéré
- Emojis : supprime tout
- Pas de Markdown non demandé (###, **)
- Ne pas mentionner le prix dans le corps du texte — il apparaît uniquement dans le paragraphe final

::: Tâche 5 : Comportement — interdictions absolues :::
- Pas d'introduction au texte produit ("Bien sûr, voici…", "Voici une version améliorée…")
- Pas de flagornerie ("Quelle excellente question !", "Vous avez tout à fait raison !")
- Pas de disclaimer, pas de résumé des modifications effectuées
- Pas de "En tant qu'IA…", "Il est important de noter…"

Voici le contenu à réécrire :
{{fiche_produit_v1}}`;
```

**Step 2: Ajouter `humaniser` dans la réponse GET**

```typescript
return NextResponse.json({
  analysis: ANALYSIS_PROMPT,
  generation: GENERATION_PROMPT,
  criteres: CRITERES_PROMPT,
  plan: DEFAULT_PLAN_PROMPT,
  humaniser: HUMANISER_PROMPT,
});
```

**Step 3: Exporter la constante pour réutilisation**

```typescript
export { HUMANISER_PROMPT };
```

**Step 4: Commit**

```bash
git add src/app/api/config/prompts/route.ts
git commit -m "feat: add default humaniser prompt to config/prompts API"
```

---

### Task 2: Créer la route API build-humanize-prompt

**Files:**
- Create: `src/app/api/playground/build-humanize-prompt/route.ts`

**Step 1: Créer la route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HUMANISER_PROMPT } from "@/app/api/config/prompts/route";

export async function POST(req: NextRequest) {
  try {
    const { htmlV1, mediaId } = await req.json();

    if (!htmlV1 || !mediaId) {
      return NextResponse.json(
        { error: "htmlV1 et mediaId sont requis" },
        { status: 400 }
      );
    }

    // Charger le prompt depuis AppConfig, sinon défaut
    const config = await prisma.appConfig.findUnique({
      where: { key: "prompt_humaniser" },
    });
    let promptTemplate = config?.value?.trim() || HUMANISER_PROMPT;

    // Charger le média pour les placeholders
    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) {
      return NextResponse.json({ error: "Média introuvable" }, { status: 404 });
    }

    // Résoudre les placeholders
    promptTemplate = promptTemplate
      .replace(/\{media\.toneDescription\}/g, media.toneDescription || "")
      .replace(/\{media\.writingStyle\}/g, media.writingStyle || "");

    // Injecter le HTML V1
    promptTemplate = promptTemplate.replace(/\{\{fiche_produit_v1\}\}/g, htmlV1);

    return NextResponse.json({ prompt: promptTemplate });
  } catch (error) {
    console.error("Erreur build-humanize-prompt:", error);
    return NextResponse.json(
      { error: "Erreur lors de la construction du prompt" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/playground/build-humanize-prompt/route.ts
git commit -m "feat: add build-humanize-prompt API route"
```

---

### Task 3: Ajouter le sous-onglet "Humaniser" dans Paramètres

**Files:**
- Modify: `src/app/parametres/page.tsx`

**Step 1: Ajouter "humaniser" au type PromptKey et à PROMPT_TABS**

```typescript
type PromptKey = "generation" | "analysis" | "criteres" | "humaniser";

const PROMPT_TABS: { key: PromptKey; label: string; hasModel: boolean }[] = [
  { key: "criteres", label: "Criteres Perplexity", hasModel: false },
  { key: "analysis", label: "Analyse", hasModel: true },
  { key: "generation", label: "Generation", hasModel: true },
  { key: "humaniser", label: "Humaniser", hasModel: false },
];
```

**Step 2: Ajouter le state humaniserPrompt**

```typescript
const [humaniserPrompt, setHumaniserPrompt] = useState("");
```

**Step 3: Charger depuis /api/config et /api/config/prompts**

Dans le useEffect existant, ajouter :
- Depuis `/api/config` : `if (data.prompt_humaniser) setHumaniserPrompt(data.prompt_humaniser);`
- Depuis `/api/config/prompts` : `setHumaniserPrompt((prev) => prev || defaults.humaniser);`

**Step 4: Ajouter au savePrompt et aux getters/setters**

- `savePrompt` : ajouter `fetch` pour `prompt_humaniser`
- `getPromptValue` : ajouter `if (tab === "humaniser") return humaniserPrompt;`
- `setPromptValue` : ajouter `else if (tab === "humaniser") setHumaniserPrompt(value);`

**Step 5: Commit**

```bash
git add src/app/parametres/page.tsx
git commit -m "feat: add Humaniser sub-tab in Paramètres prompts"
```

---

### Task 4: Modifier le Playground — sections V1, Prompt Humaniser, V2

**Files:**
- Modify: `src/app/playground/page.tsx`

**Step 1: Ajouter les states pour l'humanisation**

```typescript
// Humanisation
const [humanizePrompt, setHumanizePrompt] = useState("");
const [editableHumanizePrompt, setEditableHumanizePrompt] = useState("");
const [humanizeEditMode, setHumanizeEditMode] = useState(false);
const [loadingHumanizePrompt, setLoadingHumanizePrompt] = useState(false);
const [generatedHtmlV2, setGeneratedHtmlV2] = useState("");
const [tokenInfoV2, setTokenInfoV2] = useState<{ promptTokens: number; completionTokens: number } | null>(null);
const [loadingHumanize, setLoadingHumanize] = useState(false);
```

**Step 2: Ajouter la fonction handleLoadHumanizePrompt**

```typescript
const handleLoadHumanizePrompt = async () => {
  if (!generatedHtml || !mediaId) return;
  setLoadingHumanizePrompt(true);
  setError("");
  try {
    const res = await fetch("/api/playground/build-humanize-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ htmlV1: generatedHtml, mediaId }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur");
      return;
    }
    const data = await res.json();
    setHumanizePrompt(data.prompt);
    setEditableHumanizePrompt(data.prompt);
    setHumanizeEditMode(false);
  } catch {
    setError("Erreur réseau");
  } finally {
    setLoadingHumanizePrompt(false);
  }
};
```

**Step 3: Ajouter la fonction handleHumanize**

```typescript
const handleHumanize = async () => {
  const promptToSend = humanizeEditMode ? editableHumanizePrompt : humanizePrompt;
  if (!promptToSend.trim()) return;
  setError("");
  setLoadingHumanize(true);
  setGeneratedHtmlV2("");
  setTokenInfoV2(null);
  try {
    const res = await fetch("/api/playground/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptToSend, model }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur de génération");
      return;
    }
    const data = await res.json();
    setGeneratedHtmlV2(data.html);
    setTokenInfoV2({ promptTokens: data.promptTokens, completionTokens: data.completionTokens });
  } catch {
    setError("Erreur réseau");
  } finally {
    setLoadingHumanize(false);
  }
};
```

**Step 4: Modifier la section Résultat existante → "Résultat V1"**

Changer le titre `<CardTitle>Résultat</CardTitle>` en `<CardTitle>Résultat V1</CardTitle>` et ajouter le bouton "Humaniser" dans le header (après les tokens).

```tsx
<div className="flex items-center justify-between">
  <CardTitle>Résultat V1</CardTitle>
  <div className="flex items-center gap-3">
    {tokenInfo && (
      <p className="text-xs text-muted-foreground">
        Tokens : {tokenInfo.promptTokens} prompt + {tokenInfo.completionTokens} completion
      </p>
    )}
    {generatedHtml && !loadingGenerate && (
      <Button size="sm" onClick={handleLoadHumanizePrompt} disabled={loadingHumanizePrompt}>
        {loadingHumanizePrompt && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Humaniser
      </Button>
    )}
  </div>
</div>
```

**Step 5: Ajouter la section "Prompt Humaniser"**

Après la Card Résultat V1, ajouter :

```tsx
{(humanizePrompt || loadingHumanizePrompt) && (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle>Prompt Humaniser</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant={humanizeEditMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (!humanizeEditMode) setEditableHumanizePrompt(humanizePrompt);
              setHumanizeEditMode(!humanizeEditMode);
            }}
          >
            {humanizeEditMode ? "Vue brute" : "Mode édition"}
          </Button>
          <Button onClick={handleHumanize} disabled={loadingHumanize}>
            {loadingHumanize && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Lancer
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      {humanizeEditMode ? (
        <Textarea
          value={editableHumanizePrompt}
          onChange={(e) => setEditableHumanizePrompt(e.target.value)}
          rows={30}
          className="font-mono text-sm"
        />
      ) : (
        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/30 rounded-lg p-4 max-h-[600px] overflow-y-auto">
          {humanizePrompt}
        </pre>
      )}
    </CardContent>
  </Card>
)}
```

**Step 6: Ajouter la section "Résultat V2"**

```tsx
{(generatedHtmlV2 || loadingHumanize) && (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle>Résultat V2</CardTitle>
        {tokenInfoV2 && (
          <p className="text-xs text-muted-foreground">
            Tokens : {tokenInfoV2.promptTokens} prompt + {tokenInfoV2.completionTokens} completion
          </p>
        )}
      </div>
    </CardHeader>
    <CardContent>
      {loadingHumanize ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Humanisation en cours...</span>
        </div>
      ) : (
        <Tabs defaultValue="preview">
          <TabsList>
            <TabsTrigger value="preview" className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> Preview
            </TabsTrigger>
            <TabsTrigger value="source" className="flex items-center gap-1">
              <Code className="w-3 h-3" /> Code source
            </TabsTrigger>
          </TabsList>
          <TabsContent value="preview">
            <div
              className="prose prose-sm max-w-none dark:prose-invert p-4 border rounded-lg"
              dangerouslySetInnerHTML={{ __html: generatedHtmlV2 }}
            />
          </TabsContent>
          <TabsContent value="source">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap max-h-[600px] overflow-y-auto">
              {generatedHtmlV2}
            </pre>
          </TabsContent>
        </Tabs>
      )}
    </CardContent>
  </Card>
)}
```

**Step 7: Commit**

```bash
git add src/app/playground/page.tsx
git commit -m "feat: add Humaniser button, prompt section, and V2 result in Playground"
```

---

### Task 5: Mettre à jour CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Ajouter les nouvelles infos**

- Ajouter `prompt_humaniser` dans les clés AppConfig
- Ajouter la route `POST /api/playground/build-humanize-prompt`
- Ajouter "Humaniser" dans la description du Playground
- Ajouter dans l'historique des features
- Mettre à jour la description de la page Paramètres (4 sous-onglets prompts)

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with humaniser feature"
```
