# Serpmantics Validate Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Valider" button next to the "Mot clé principal" field that calls the Serpmantics API to auto-fill the keywords table with SEO expressions.

**Architecture:** A new Next.js API route (`POST /api/serpmantics/guide`) handles the Serpmantics API calls server-side (create guide + polling), keeping the API key secret. The frontend calls this route and updates the `keywords` state with the returned data. The API key is stored in `.env` and displayed masked in `/parametres`.

**Tech Stack:** Next.js App Router, React useState, Serpmantics REST API, lucide-react (Loader2 icon)

---

## Task 1: Add SERPMANTICS_API_KEY to environment files

**Files:**
- Modify: `c:\ClaudeCode\fiche-produit-generator\.env`
- Modify: `c:\ClaudeCode\fiche-produit-generator\.env.example`

**Step 1: Read .env.example to check current content**

Run: read the file `c:\ClaudeCode\fiche-produit-generator\.env.example`

**Step 2: Add key to .env.example**

Append to `.env.example`:
```
SERPMANTICS_API_KEY="your-serpmantics-key-here"
```

**Step 3: Add real key to .env**

Append to `.env`:
```
SERPMANTICS_API_KEY="sm66...00bf"
```
> Note: use the actual key from the user's Serpmantics account (visible in their screenshot: starts with `sm66`, ends with `00bf`)

**Step 4: Verify**

Run: `grep SERPMANTICS .env.example` — should show the line.

---

## Task 2: Create Serpmantics API route

**Files:**
- Create: `c:\ClaudeCode\fiche-produit-generator\src\app\api\serpmantics\guide\route.ts`

**Step 1: Create the file with this exact content**

```typescript
import { NextRequest, NextResponse } from "next/server";

const SERPMANTICS_HOST = "https://app.serpmantics.com";
const MAX_POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 3000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.SERPMANTICS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SERPMANTICS_API_KEY non configuree" },
      { status: 500 }
    );
  }

  const { keyword } = await req.json();
  if (!keyword?.trim()) {
    return NextResponse.json(
      { error: "Mot-cle requis" },
      { status: 400 }
    );
  }

  // Step 1: Create guide
  const createRes = await fetch(`${SERPMANTICS_HOST}/api/v1/guides`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ queries: [keyword.trim()], lang: "fr" }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    return NextResponse.json(
      { error: `Erreur creation guide Serpmantics: ${text}` },
      { status: createRes.status }
    );
  }

  const createData = await createRes.json();
  const guideId = createData.guides?.[0]?.id;
  if (!guideId) {
    return NextResponse.json(
      { error: "ID guide non recu" },
      { status: 500 }
    );
  }

  // Step 2: Poll until ready
  let guide = null;
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(
      `${SERPMANTICS_HOST}/api/v1/guide?id=${guideId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (pollRes.status === 202) continue; // not ready yet
    if (!pollRes.ok) {
      const text = await pollRes.text();
      return NextResponse.json(
        { error: `Erreur polling Serpmantics: ${text}` },
        { status: pollRes.status }
      );
    }

    guide = await pollRes.json();
    break;
  }

  if (!guide) {
    return NextResponse.json(
      { error: "Timeout: le guide Serpmantics n'est pas pret apres 45 secondes" },
      { status: 504 }
    );
  }

  // Step 3: Extract keywords
  const addList = guide.guide?.guide?.add ?? [];
  const keywords = addList.map((item: { expression: string; from: number; to: number }) => ({
    keyword: item.expression,
    min: item.from,
    max: item.to,
  }));

  return NextResponse.json({ keywords });
}
```

**Step 2: Verify the file was created**

Run: `ls c:\ClaudeCode\fiche-produit-generator\src\app\api\serpmantics\guide\` — should show `route.ts`

---

## Task 3: Update guide-form.tsx — add state and handler

**Files:**
- Modify: `c:\ClaudeCode\fiche-produit-generator\src\components\guides\guide-form.tsx`

**Step 1: Add Loader2 to lucide-react import (line 5)**

Current:
```typescript
import { Plus, X, ClipboardPaste } from "lucide-react";
```
New:
```typescript
import { Plus, X, ClipboardPaste, Loader2 } from "lucide-react";
```

**Step 2: Add two new state variables after line 56 (`const [error, setError] = useState...`)**

Add after:
```typescript
  const [error, setError] = useState<string | null>(null);
```
New content after that line:
```typescript
  const [serpLoading, setSerpLoading] = useState(false);
  const [serpError, setSerpError] = useState<string | null>(null);
```

**Step 3: Add the handler function after `handlePasteImport` (after line 122)**

Add after the closing `}` of `handlePasteImport`:
```typescript
  const handleSerpValidate = async () => {
    if (!title.trim()) return;
    setSerpLoading(true);
    setSerpError(null);
    try {
      const res = await fetch("/api/serpmantics/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: title }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur Serpmantics");
      }
      const data = await res.json();
      if (data.keywords?.length > 0) {
        setKeywords(data.keywords);
      } else {
        setSerpError("Aucun mot-cle retourne par Serpmantics");
      }
    } catch (e: any) {
      setSerpError(e.message || "Erreur Serpmantics");
    } finally {
      setSerpLoading(false);
    }
  };
```

---

## Task 4: Update guide-form.tsx — update the UI

**Files:**
- Modify: `c:\ClaudeCode\fiche-produit-generator\src\components\guides\guide-form.tsx`

**Step 1: Replace the Input block for "Mot clé principal" (lines 194–202)**

Current:
```tsx
          <div>
            <Label htmlFor="title">Mot clé principal</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Meilleurs seche-cheveux 2025"
            />
          </div>
```

New:
```tsx
          <div>
            <Label htmlFor="title">Mot clé principal</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Meilleurs seche-cheveux 2025"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSerpValidate}
                disabled={!title.trim() || serpLoading}
                className="shrink-0"
              >
                {serpLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Valider"
                )}
              </Button>
            </div>
            {serpError && (
              <p className="text-sm text-destructive mt-1">{serpError}</p>
            )}
          </div>
```

**Step 2: Verify the component renders without TypeScript errors**

Run: `cd c:\ClaudeCode\fiche-produit-generator && npx tsc --noEmit 2>&1 | head -20`
Expected: no errors (or only pre-existing unrelated errors)

---

## Task 5: Expose Serpmantics key in config/keys route

**Files:**
- Modify: `c:\ClaudeCode\fiche-produit-generator\src\app\api\config\keys\route.ts`

**Step 1: Replace file content**

Current content:
```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY || "";
  const apifyToken = process.env.APIFY_API_TOKEN || "";

  return NextResponse.json({
    openai: openaiKey ? `sk-...${openaiKey.slice(-4)}` : "",
    apify: apifyToken ? `apify_...${apifyToken.slice(-4)}` : "",
  });
}
```

New content:
```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY || "";
  const apifyToken = process.env.APIFY_API_TOKEN || "";
  const serpmanticsKey = process.env.SERPMANTICS_API_KEY || "";

  return NextResponse.json({
    openai: openaiKey ? `sk-...${openaiKey.slice(-4)}` : "",
    apify: apifyToken ? `apify_...${apifyToken.slice(-4)}` : "",
    serpmantics: serpmanticsKey ? `key_...${serpmanticsKey.slice(-4)}` : "",
  });
}
```

---

## Task 6: Display Serpmantics key in /parametres page

**Files:**
- Modify: `c:\ClaudeCode\fiche-produit-generator\src\app\parametres\page.tsx`

**Step 1: Update the keys state type (line 36)**

Current:
```typescript
  const [keys, setKeys] = useState<{ openai: string; apify: string }>({ openai: "", apify: "" });
```

New:
```typescript
  const [keys, setKeys] = useState<{ openai: string; apify: string; serpmantics: string }>({ openai: "", apify: "", serpmantics: "" });
```

**Step 2: Add Serpmantics row after the Apify row (after line 117)**

Current (lines 112–117):
```tsx
                <div className="flex items-center justify-between">
                  <Label>Apify</Label>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {keys.apify || "Non configuree"}
                  </code>
                </div>
```

Add after that closing `</div>`:
```tsx
                <div className="flex items-center justify-between">
                  <Label>Serpmantics</Label>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {keys.serpmantics || "Non configuree"}
                  </code>
                </div>
```

---

## Verification

1. Start dev server: `cd c:\ClaudeCode\fiche-produit-generator && npm run dev`
2. Open `http://localhost:3000/guides/new` (or wherever the form is)
3. Type a keyword like "robot aspirateur" in "Mot clé principal"
4. Click "Valider" — spinner appears during ~10-30s
5. Verify the keywords table fills with expressions + min + max values
6. Go to `http://localhost:3000/parametres` → verify Serpmantics key appears masked
7. Test with empty field — "Valider" button should be disabled
8. Test TypeScript: `npx tsc --noEmit` — no new errors
