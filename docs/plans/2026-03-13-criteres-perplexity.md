# Critères de sélection + bouton Perplexity — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter une section "Critères de sélection des produits" dans le formulaire de création de guide, avec un bouton "Générer" qui ouvre Perplexity dans un nouvel onglet avec un prompt configurable.

**Architecture:** Nouveau champ `criteria` sur le modèle `Guide` (Prisma + migration). Nouveau prompt `prompt_criteres` dans `AppConfig`. Nouveau tab dans Paramètres. Nouvelle Card dans `guide-form.tsx`.

**Tech Stack:** Next.js 14, Prisma (SQLite), TypeScript, Tailwind, shadcn/ui

---

### Task 1 : Ajouter le champ `criteria` au modèle Prisma

**Files:**
- Modify: `prisma/schema.prisma` (modèle `Guide`, après `title`)

**Step 1 : Ajouter le champ dans le schéma**

Dans `prisma/schema.prisma`, dans le modèle `Guide`, après la ligne `title String` :

```prisma
criteria String @default("")
```

**Step 2 : Lancer la migration**

```bash
cd C:/ClaudeCode/fiche-produit-generator
npx prisma migrate dev --name add-criteria-to-guide
```

Expected : `Your database is now in sync with your schema.`

---

### Task 2 : Mettre à jour l'API POST /api/guides

**Files:**
- Modify: `src/app/api/guides/route.ts`

**Step 1 : Accepter `criteria` dans le body**

Ligne 18, remplacer :
```ts
const { title, mediaId, products, keywords } = await req.json();
```
par :
```ts
const { title, mediaId, products, keywords, criteria } = await req.json();
```

**Step 2 : Passer `criteria` à Prisma create**

Dans le bloc `prisma.guide.create`, dans `data`, après `mediaId,` :
```ts
criteria: criteria ?? "",
```

**Step 3 : Vérifier manuellement**

Démarrer le serveur `npm run dev`, créer un guide via `/guides/nouveau`, vérifier en base que `criteria` est bien sauvegardé (peut être vide pour l'instant).

---

### Task 3 : Ajouter le prompt par défaut dans /api/config/prompts

**Files:**
- Modify: `src/app/api/config/prompts/route.ts`

**Step 1 : Ajouter la constante**

Après la constante `GENERATION_PROMPT`, ajouter :
```ts
const CRITERES_PROMPT = `Je crée un guide d'achat sur : #MotClesprincipal Merci de me donner les 5 critères essentiels pour les choisir sous forme d'une liste numéroté dans une black windows Pour chaque critère, je veux une mini-explication. Le critère et son explication sur la même ligne Je ne veux pas que tu fasses apparaître les sources`;
```

**Step 2 : L'exposer dans le GET**

Remplacer le return :
```ts
return NextResponse.json({
  analysis: ANALYSIS_PROMPT,
  generation: GENERATION_PROMPT,
  criteres: CRITERES_PROMPT,
});
```

---

### Task 4 : Ajouter le tab "Critères Perplexity" dans Paramètres

**Files:**
- Modify: `src/app/parametres/page.tsx`

**Step 1 : Ajouter l'état**

Après la ligne `const [analysisPrompt, setAnalysisPrompt] = useState("");` :
```ts
const [criteresPrompt, setCriteresPrompt] = useState("");
```

Après `const [promptTab, setPromptTab] = useState<"generation" | "analysis">("generation");` :
```ts
// Changer le type du tab
```
Remplacer le type du `promptTab` :
```ts
const [promptTab, setPromptTab] = useState<"generation" | "analysis" | "criteres">("generation");
```

**Step 2 : Charger le prompt depuis l'API config**

Dans le `useEffect`, après `if (data.prompt_analysis) setAnalysisPrompt(data.prompt_analysis);` :
```ts
if (data.prompt_criteres) setCriteresPrompt(data.prompt_criteres);
```

Dans le fetch `/api/config/prompts`, après `setAnalysisPrompt((prev) => prev || defaults.analysis);` :
```ts
setCriteresPrompt((prev) => prev || defaults.criteres);
```

**Step 3 : Sauvegarder le prompt critères**

Dans `savePrompt`, ajouter dans le `Promise.all` :
```ts
fetch("/api/config", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "prompt_criteres", value: criteresPrompt }),
}),
```

**Step 4 : Ajouter le bouton de tab dans le JSX**

Dans la section `<div className="flex gap-1">`, après le bouton "Analyse" :
```tsx
<button
  onClick={() => setPromptTab("criteres")}
  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
    promptTab === "criteres"
      ? "bg-primary text-primary-foreground"
      : "bg-muted text-muted-foreground hover:text-foreground"
  }`}
>
  Critères Perplexity
</button>
```

**Step 5 : Ajouter le textarea dans le JSX**

Après le bloc `promptTab === "analysis"`, ajouter :
```tsx
) : promptTab === "criteres" ? (
  <textarea
    value={criteresPrompt}
    onChange={(e) => setCriteresPrompt(e.target.value)}
    className="w-full h-[500px] text-xs bg-muted p-4 rounded-lg font-mono leading-relaxed resize-y border-0 focus:outline-none focus:ring-2 focus:ring-ring"
    spellCheck={false}
  />
```

Note : le JSX actuel se termine par `)}`. Il faut transformer le ternaire binaire en ternaire chaîné. La structure finale doit être :
```tsx
{promptTab === "generation" ? (
  <textarea ... value={generationPrompt} ... />
) : promptTab === "analysis" ? (
  <textarea ... value={analysisPrompt} ... />
) : (
  <textarea ... value={criteresPrompt} ... />
)}
```

**Step 6 : Vérifier dans le navigateur**

Aller sur `/parametres`, vérifier que l'onglet "Critères Perplexity" apparaît, que le prompt par défaut est chargé, et que la sauvegarde fonctionne.

---

### Task 5 : Ajouter la Card "Critères de sélection" dans guide-form.tsx

**Files:**
- Modify: `src/components/guides/guide-form.tsx`

**Step 1 : Ajouter les imports nécessaires**

Ajouter `ExternalLink` à l'import lucide-react :
```ts
import { Plus, X, Loader2, ExternalLink } from "lucide-react";
```

Ajouter `Textarea` si disponible, sinon utiliser un `textarea` HTML brut. Vérifier avec :
```bash
ls C:/ClaudeCode/fiche-produit-generator/src/components/ui/ | grep -i textarea
```
Si présent, ajouter l'import :
```ts
import { Textarea } from "@/components/ui/textarea";
```

**Step 2 : Ajouter l'état `criteria`**

Après `const [error, setError] = useState<string | null>(null);` :
```ts
const [criteria, setCriteria] = useState("");
const [criteresPrompt, setCriteresPrompt] = useState("");
```

**Step 3 : Charger le prompt critères au montage**

Dans le `useEffect` existant, après `fetch("/api/medias")...` :
```ts
fetch("/api/config")
  .then((r) => r.json())
  .then((data) => {
    if (data.prompt_criteres) {
      setCriteresPrompt(data.prompt_criteres);
    } else {
      // Fallback sur le prompt par défaut
      fetch("/api/config/prompts")
        .then((r) => r.json())
        .then((defaults) => setCriteresPrompt(defaults.criteres ?? ""));
    }
  });
```

**Step 4 : Ajouter la fonction `handleGenererCriteres`**

Après la fonction `handleSubmit` :
```ts
const handleGenererCriteres = () => {
  if (!title.trim()) {
    setError("Renseignez d'abord le mot clé principal");
    return;
  }
  const prompt = criteresPrompt.replace("#MotClesprincipal", title.trim());
  const url = `https://www.perplexity.ai/search?q=${encodeURIComponent(prompt)}`;
  window.open(url, "_blank");
};
```

**Step 5 : Passer `criteria` dans handleSubmit**

Dans le body du fetch POST `/api/guides`, après `keywords: keywords.map(...)` :
```ts
criteria: criteria.trim(),
```

**Step 6 : Ajouter la Card dans le JSX**

Entre la Card "Informations du guide" et la Card "Produits", insérer :

```tsx
{/* Critères de sélection */}
<Card>
  <CardHeader>
    <CardTitle className="text-base">Critères de sélection des produits</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <div>
      <Label htmlFor="criteria">Critères</Label>
      <textarea
        id="criteria"
        value={criteria}
        onChange={(e) => setCriteria(e.target.value)}
        placeholder="Ex: 1. Autonomie — Privilégiez plus de 40 min..."
        className="mt-1 w-full min-h-[120px] text-sm bg-muted p-3 rounded-md font-sans leading-relaxed resize-y border border-input focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenererCriteres}
    >
      <ExternalLink className="mr-2 h-3 w-3" />
      Générer
    </Button>
  </CardContent>
</Card>
```

**Step 7 : Vérifier dans le navigateur**

Aller sur `/guides/nouveau`, vérifier :
- La card "Critères de sélection" apparaît entre les deux cards existantes
- Sans mot clé → message d'erreur "Renseignez d'abord le mot clé principal"
- Avec mot clé → Perplexity s'ouvre dans un nouvel onglet avec le bon prompt
- Le champ textarea fonctionne (saisie libre)
- La création du guide envoie bien `criteria`
