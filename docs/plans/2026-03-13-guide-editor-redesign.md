# Guide Editor Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refonte de la page `/guides/[id]` en 4 onglets (Vue d'ensemble, Produits, Plan, Article) avec éditeur WYSIWYG TipTap et score SEO Serpmantics — phase UX avec données fictives uniquement.

**Architecture:** La page `/guides/[id]` devient un layout à onglets shadcn/ui. Chaque onglet est un composant React indépendant. Les données viennent de fichiers JSON fixtures (pas d'API). L'éditeur WYSIWYG est TipTap.

**Tech Stack:** Next.js 14 App Router, TipTap (WYSIWYG), shadcn/ui Tabs, TypeScript, données JSON fixtures

**Important:** Pas de tests dans ce projet. Pas d'appels API réels dans cette phase. Données fictives uniquement.

---

### Task 1 : Créer les données fictives (fixtures)

**Files:**
- Create: `fixtures/guide.json`
- Create: `fixtures/products.json`
- Create: `fixtures/plan.json`
- Create: `fixtures/article.json`
- Create: `fixtures/serpmantics-score.json`

**Step 1: Créer `fixtures/guide.json`**

```json
{
  "id": "fixture-guide-1",
  "title": "Meilleurs robots aspirateurs 2025",
  "keyword": "meilleurs robots aspirateurs 2025",
  "targetWordCount": 4200,
  "selectionCriteria": "Choisir des produits avec plus de 100 avis, compatibles parquet et carrelage, autonomie supérieure à 90 minutes.",
  "slug": "meilleurs-robots-aspirateurs-2025",
  "metaTitle": "Meilleurs robots aspirateurs 2025 — Comparatif & Avis",
  "metaDescription": "Découvrez notre sélection des 5 meilleurs robots aspirateurs 2025. Comparatif complet, avis et guide d'achat pour choisir le modèle idéal.",
  "imageCaption": "Robot aspirateur iRobot Roomba j7+ sur parquet",
  "currentStep": 3,
  "steps": {
    "guide": { "status": "done", "date": "2026-03-11" },
    "products": { "status": "done", "date": "2026-03-12" },
    "plan": { "status": "in_progress", "date": null },
    "article": { "status": "locked", "date": null }
  },
  "planSeoScore": 72,
  "articleSeoScore": null
}
```

**Step 2: Créer `fixtures/products.json`**

```json
[
  {
    "id": "prod-1",
    "asin": "B09X3P4QGM",
    "title": "iRobot Roomba j7+",
    "brand": "iRobot",
    "price": "549,99 €",
    "imageUrl": "https://placehold.co/200x200?text=Roomba+j7%2B",
    "reviewCount": 2847,
    "rating": 4.4,
    "status": "done"
  },
  {
    "id": "prod-2",
    "asin": "B0BW3TT41M",
    "title": "Roborock S8 Pro Ultra",
    "brand": "Roborock",
    "price": "999,99 €",
    "imageUrl": "https://placehold.co/200x200?text=Roborock+S8",
    "reviewCount": 1243,
    "rating": 4.6,
    "status": "done"
  },
  {
    "id": "prod-3",
    "asin": "B0C5MKL8VR",
    "title": "Ecovacs Deebot X2 Omni",
    "brand": "Ecovacs",
    "price": "799,00 €",
    "imageUrl": "https://placehold.co/200x200?text=Deebot+X2",
    "reviewCount": 876,
    "rating": 4.3,
    "status": "done"
  }
]
```

**Step 3: Créer `fixtures/plan.json`**

```json
{
  "html": "<h2>Introduction</h2><p><strong>Brief :</strong> Présenter le sujet, accrocher le lecteur avec les critères clés de choix.</p><p><strong>Mots-clés :</strong> robot aspirateur, meilleur 2025, guide d'achat</p><p><strong>Mots cible :</strong> 300 mots</p><h2>Critères de sélection</h2><p><strong>Brief :</strong> Expliquer sur quoi on juge les produits : autonomie, puissance, navigation.</p><p><strong>Mots-clés :</strong> autonomie, puissance aspiration, cartographie, navigation laser</p><p><strong>Mots cible :</strong> 400 mots</p><h2>Produit 1 — iRobot Roomba j7+</h2><p><strong>Brief :</strong> Présenter le Roomba j7+, ses points forts (évitement d'obstacles) et ses limites.</p><p><strong>Mots-clés :</strong> iRobot, évitement obstacles, vider automatiquement</p><p><strong>Mots cible :</strong> 600 mots</p><h2>Produit 2 — Roborock S8 Pro Ultra</h2><p><strong>Brief :</strong> Présenter le S8 Pro Ultra, le meilleur polyvalent du marché.</p><p><strong>Mots-clés :</strong> Roborock, lavage, station auto-nettoyante</p><p><strong>Mots cible :</strong> 600 mots</p><h2>Produit 3 — Ecovacs Deebot X2 Omni</h2><p><strong>Brief :</strong> Présenter le Deebot X2, design carré pour les coins.</p><p><strong>Mots-clés :</strong> Ecovacs, coins, aspiration et lavage combinés</p><p><strong>Mots cible :</strong> 600 mots</p><h2>FAQ</h2><p><strong>Brief :</strong> 5 questions fréquentes des acheteurs.</p><p><strong>Mots cible :</strong> 400 mots</p><h2>Sommaire</h2><p><strong>Brief :</strong> Liste des produits avec liens internes.</p><p><strong>Mots cible :</strong> 100 mots</p>"
}
```

**Step 4: Créer `fixtures/article.json`**

```json
{
  "html": "<h1>Meilleurs robots aspirateurs 2025 — Notre comparatif</h1><h2>Sommaire</h2><ol><li>iRobot Roomba j7+</li><li>Roborock S8 Pro Ultra</li><li>Ecovacs Deebot X2 Omni</li></ol><h2>Introduction</h2><p>Le robot aspirateur est devenu un allié indispensable du quotidien. En 2025, les modèles ont fait un bond technologique considérable : navigation laser, évitement d'obstacles par caméra, station de vidange automatique...</p><h2>iRobot Roomba j7+</h2><p>Le <strong>Roomba j7+</strong> se distingue par son système d'évitement d'obstacles basé sur la caméra. Il reconnaît et contourne les câbles, jouets et autres obstacles du quotidien avec une précision remarquable.</p><h2>FAQ</h2><h3>Quel robot aspirateur choisir pour un appartement ?</h3><p>Pour un appartement, le iRobot Roomba j7+ est idéal grâce à sa taille compacte et sa navigation intelligente.</p>"
}
```

**Step 5: Créer `fixtures/serpmantics-score.json`**

```json
{
  "score": 72,
  "maxScore": 100,
  "keywords": [
    { "expression": "robot aspirateur", "target": 8, "current": 6, "ok": true },
    { "expression": "meilleur 2025", "target": 4, "current": 4, "ok": true },
    { "expression": "autonomie", "target": 5, "current": 2, "ok": false },
    { "expression": "navigation laser", "target": 3, "current": 0, "ok": false },
    { "expression": "puissance aspiration", "target": 3, "current": 3, "ok": true },
    { "expression": "station automatique", "target": 2, "current": 1, "ok": false }
  ]
}
```

**Step 6: Commit**

```bash
git add fixtures/
git commit -m "feat: add fixture data for guide editor UX"
```

---

### Task 2 : Installer TipTap

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Installer les packages TipTap**

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-image @tiptap/extension-link @tiptap/extension-text-align @tiptap/extension-underline
```

**Step 2: Vérifier l'installation**

Lancer `npm run dev` et vérifier qu'il n'y a pas d'erreur de démarrage.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install TipTap WYSIWYG editor"
```

---

### Task 3 : Créer le composant RichEditor (TipTap)

**Files:**
- Create: `src/components/editor/rich-editor.tsx`

**Step 1: Créer `src/components/editor/rich-editor.tsx`**

```tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Bold, Italic, UnderlineIcon, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichEditorProps {
  content: string;
  onChange?: (html: string) => void;
  editable?: boolean;
  className?: string;
}

export function RichEditor({ content, onChange, editable = true, className }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className={cn("border rounded-md", className)}>
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive("bold")}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1 self-center" />
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-bold" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Button>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-bold" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Button>
          <div className="w-px h-6 bg-border mx-1 self-center" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1 self-center" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
```

**Step 2: Ajouter les styles prose dans `tailwind.config.ts`**

Installer le plugin typographie si absent :
```bash
npm install @tailwindcss/typography
```

Dans `tailwind.config.ts`, ajouter dans `plugins` :
```ts
require("@tailwindcss/typography"),
```

**Step 3: Commit**

```bash
git add src/components/editor/ tailwind.config.ts package.json package-lock.json
git commit -m "feat: add TipTap RichEditor component"
```

---

### Task 4 : Créer le composant SeoScoreBar

**Files:**
- Create: `src/components/editor/seo-score-bar.tsx`

**Step 1: Créer `src/components/editor/seo-score-bar.tsx`**

```tsx
"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SeoKeyword {
  expression: string;
  target: number;
  current: number;
  ok: boolean;
}

interface SeoScoreBarProps {
  score: number | null;
  keywords?: SeoKeyword[];
  onRecalculate?: () => void;
  loading?: boolean;
}

export function SeoScoreBar({ score, keywords = [], onRecalculate, loading }: SeoScoreBarProps) {
  const color = score === null ? "bg-muted" : score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="border rounded-md p-4 space-y-3 bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Score SEO Serpmantics</span>
          {score !== null ? (
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
              </div>
              <span className={cn("text-sm font-bold", score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600")}>
                {score} / 100
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Non calculé</span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onRecalculate} disabled={loading}>
          <RefreshCw className={cn("mr-1 h-3 w-3", loading && "animate-spin")} />
          Recalculer
        </Button>
      </div>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <span
              key={kw.expression}
              className={cn(
                "text-xs px-2 py-0.5 rounded-full border",
                kw.ok
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              )}
            >
              {kw.ok ? "✓" : "✗"} {kw.expression} ({kw.current}/{kw.target})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/editor/seo-score-bar.tsx
git commit -m "feat: add SeoScoreBar component"
```

---

### Task 5 : Créer le composant MetaFields

**Files:**
- Create: `src/components/editor/meta-fields.tsx`

**Step 1: Créer `src/components/editor/meta-fields.tsx`**

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MetaFieldsProps {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  imageCaption: string;
  onChange: (field: string, value: string) => void;
}

export function MetaFields({ slug, metaTitle, metaDescription, imageCaption, onChange }: MetaFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 p-4 border rounded-md bg-muted/10">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Slug</Label>
          <Input
            value={slug}
            onChange={(e) => onChange("slug", e.target.value)}
            placeholder="meilleurs-robots-aspirateurs-2025"
            className="mt-1 text-sm font-mono"
          />
        </div>
        <div>
          <Label className="text-xs">Meta title</Label>
          <Input
            value={metaTitle}
            onChange={(e) => onChange("metaTitle", e.target.value)}
            placeholder="Titre SEO (60 car. max)"
            className="mt-1 text-sm"
          />
          <p className="text-xs text-muted-foreground mt-0.5">{metaTitle.length} / 60</p>
        </div>
      </div>
      <div>
        <Label className="text-xs">Meta description</Label>
        <Textarea
          value={metaDescription}
          onChange={(e) => onChange("metaDescription", e.target.value)}
          placeholder="Description SEO (155 car. max)"
          className="mt-1 text-sm resize-none"
          rows={2}
        />
        <p className="text-xs text-muted-foreground mt-0.5">{metaDescription.length} / 155</p>
      </div>
      <div>
        <Label className="text-xs">Légende image principale</Label>
        <Input
          value={imageCaption}
          onChange={(e) => onChange("imageCaption", e.target.value)}
          placeholder="Ex: Robot aspirateur iRobot Roomba j7+ sur parquet"
          className="mt-1 text-sm"
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/editor/meta-fields.tsx
git commit -m "feat: add MetaFields component"
```

---

### Task 6 : Créer l'onglet Vue d'ensemble

**Files:**
- Create: `src/components/guides/tabs/tab-overview.tsx`

**Step 1: Créer `src/components/guides/tabs/tab-overview.tsx`**

```tsx
"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StepStatus {
  status: "done" | "in_progress" | "locked";
  date: string | null;
}

interface GuideOverviewData {
  keyword: string;
  targetWordCount: number;
  selectionCriteria: string;
  steps: {
    guide: StepStatus;
    products: StepStatus;
    plan: StepStatus;
    article: StepStatus;
  };
}

interface TabOverviewProps {
  data: GuideOverviewData;
  onTabChange: (tab: string) => void;
}

const STEPS = [
  { key: "guide", label: "Guide créé", tab: null },
  { key: "products", label: "Produits récupérés", tab: "products" },
  { key: "plan", label: "Plan d'article", tab: "plan" },
  { key: "article", label: "Article rédigé", tab: "article" },
] as const;

function StepIcon({ status }: { status: StepStatus["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (status === "in_progress") return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
  return <Lock className="h-5 w-5 text-muted-foreground" />;
}

export function TabOverview({ data, onTabChange }: TabOverviewProps) {
  const [criteria, setCriteria] = useState(data.selectionCriteria);

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informations du guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mot-clé principal</span>
            <span className="font-medium">{data.keyword}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Nombre de mots cible</span>
            <span className="font-medium">{data.targetWordCount.toLocaleString()} mots</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Critères de sélection des produits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            placeholder="Ex: Choisir des produits avec > 100 avis, compatible parquet..."
            rows={3}
            className="text-sm"
          />
          <Button size="sm" variant="outline">Sauvegarder</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Progression</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {STEPS.map((step) => {
            const stepData = data.steps[step.key];
            return (
              <div key={step.key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StepIcon status={stepData.status} />
                  <span className={cn("text-sm", stepData.status === "locked" && "text-muted-foreground")}>
                    {step.label}
                  </span>
                  {stepData.date && (
                    <span className="text-xs text-muted-foreground">{stepData.date}</span>
                  )}
                </div>
                {step.tab && stepData.status !== "locked" && (
                  <Button variant="ghost" size="sm" onClick={() => onTabChange(step.tab!)}>
                    Voir →
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/guides/tabs/
git commit -m "feat: add TabOverview component"
```

---

### Task 7 : Créer l'onglet Produits

**Files:**
- Create: `src/components/guides/tabs/tab-products.tsx`

**Step 1: Créer `src/components/guides/tabs/tab-products.tsx`**

```tsx
"use client";

import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  asin: string;
  title: string;
  brand: string;
  price: string;
  imageUrl: string;
  reviewCount: number;
  rating: number;
  status: "done" | "pending" | "error";
}

interface TabProductsProps {
  products: Product[];
}

function StatusBadge({ status }: { status: Product["status"] }) {
  if (status === "done") return (
    <span className="flex items-center gap-1 text-xs text-green-600">
      <CheckCircle2 className="h-3 w-3" /> Récupéré
    </span>
  );
  if (status === "pending") return (
    <span className="flex items-center gap-1 text-xs text-yellow-600">
      <Clock className="h-3 w-3" /> En attente
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="h-3 w-3" /> Erreur
    </span>
  );
}

export function TabProducts({ products }: TabProductsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{products.length} produits</p>
        <Button size="sm">Lancer la récupération</Button>
      </div>

      {products.map((product, index) => (
        <Card key={product.id}>
          <CardContent className="flex items-center gap-4 p-4">
            <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-16 h-16 object-cover rounded-md border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{product.title}</p>
              <p className="text-xs text-muted-foreground">{product.brand} · {product.asin}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-semibold">{product.price}</span>
                <span className="text-xs text-muted-foreground">★ {product.rating} ({product.reviewCount.toLocaleString()} avis)</span>
              </div>
            </div>
            <StatusBadge status={product.status} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/guides/tabs/tab-products.tsx
git commit -m "feat: add TabProducts component"
```

---

### Task 8 : Créer l'onglet Plan

**Files:**
- Create: `src/components/guides/tabs/tab-plan.tsx`

**Step 1: Créer `src/components/guides/tabs/tab-plan.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichEditor } from "@/components/editor/rich-editor";
import { SeoScoreBar } from "@/components/editor/seo-score-bar";
import { MetaFields } from "@/components/editor/meta-fields";

interface SeoKeyword {
  expression: string;
  target: number;
  current: number;
  ok: boolean;
}

interface TabPlanProps {
  initialHtml: string;
  seoScore: number | null;
  seoKeywords: SeoKeyword[];
  meta: {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    imageCaption: string;
  };
}

export function TabPlan({ initialHtml, seoScore, seoKeywords, meta: initialMeta }: TabPlanProps) {
  const [html, setHtml] = useState(initialHtml);
  const [meta, setMeta] = useState(initialMeta);
  const [score, setScore] = useState(seoScore);
  const [keywords, setKeywords] = useState(seoKeywords);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleMetaChange = (field: string, value: string) => {
    setMeta((prev) => ({ ...prev, [field]: value }));
  };

  const handleRecalculate = async () => {
    setScoreLoading(true);
    // TODO: appel réel à /api/serpmantics/score
    await new Promise((r) => setTimeout(r, 1500));
    setScore(74);
    setScoreLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    // TODO: appel réel à /api/guides/[id]/plan/generate
    await new Promise((r) => setTimeout(r, 2000));
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      <SeoScoreBar
        score={score}
        keywords={keywords}
        onRecalculate={handleRecalculate}
        loading={scoreLoading}
      />

      <MetaFields
        slug={meta.slug}
        metaTitle={meta.metaTitle}
        metaDescription={meta.metaDescription}
        imageCaption={meta.imageCaption}
        onChange={handleMetaChange}
      />

      <RichEditor content={html} onChange={setHtml} />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleGenerate} disabled={generating}>
          {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {generating ? "Génération en cours..." : "Générer le plan (IA)"}
        </Button>
        <Button>Valider le plan →</Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/guides/tabs/tab-plan.tsx
git commit -m "feat: add TabPlan component with WYSIWYG and SEO score"
```

---

### Task 9 : Créer l'onglet Article

**Files:**
- Create: `src/components/guides/tabs/tab-article.tsx`

**Step 1: Créer `src/components/guides/tabs/tab-article.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichEditor } from "@/components/editor/rich-editor";
import { SeoScoreBar } from "@/components/editor/seo-score-bar";
import { MetaFields } from "@/components/editor/meta-fields";

interface SeoKeyword {
  expression: string;
  target: number;
  current: number;
  ok: boolean;
}

interface TabArticleProps {
  initialHtml: string;
  seoScore: number | null;
  seoKeywords: SeoKeyword[];
  meta: {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    imageCaption: string;
  };
}

export function TabArticle({ initialHtml, seoScore, seoKeywords, meta: initialMeta }: TabArticleProps) {
  const [html, setHtml] = useState(initialHtml);
  const [meta, setMeta] = useState(initialMeta);
  const [score, setScore] = useState(seoScore);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleMetaChange = (field: string, value: string) => {
    setMeta((prev) => ({ ...prev, [field]: value }));
  };

  const handleRecalculate = async () => {
    setScoreLoading(true);
    // TODO: appel réel à /api/serpmantics/score
    await new Promise((r) => setTimeout(r, 1500));
    setScore(85);
    setScoreLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    // TODO: appel réel à /api/guides/[id]/article/generate
    await new Promise((r) => setTimeout(r, 3000));
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      <SeoScoreBar
        score={score}
        keywords={[]}
        onRecalculate={handleRecalculate}
        loading={scoreLoading}
      />

      <MetaFields
        slug={meta.slug}
        metaTitle={meta.metaTitle}
        metaDescription={meta.metaDescription}
        imageCaption={meta.imageCaption}
        onChange={handleMetaChange}
      />

      <RichEditor content={html} onChange={setHtml} />

      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={generating}>
          {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {generating ? "Génération en cours..." : "Générer l'article (IA)"}
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/guides/tabs/tab-article.tsx
git commit -m "feat: add TabArticle component with WYSIWYG and SEO score"
```

---

### Task 10 : Refondre la page `/guides/[id]`

**Files:**
- Modify: `src/app/guides/[id]/page.tsx`

**Step 1: Lire le fichier actuel**

Lire `src/app/guides/[id]/page.tsx` pour comprendre la structure existante.

**Step 2: Remplacer par la nouvelle version avec onglets**

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabOverview } from "@/components/guides/tabs/tab-overview";
import { TabProducts } from "@/components/guides/tabs/tab-products";
import { TabPlan } from "@/components/guides/tabs/tab-plan";
import { TabArticle } from "@/components/guides/tabs/tab-article";

// Import données fictives
import guideData from "@/../../fixtures/guide.json";
import productsData from "@/../../fixtures/products.json";
import planData from "@/../../fixtures/plan.json";
import articleData from "@/../../fixtures/article.json";
import scoreData from "@/../../fixtures/serpmantics-score.json";

export default function GuidePage({ params }: { params: { id: string } }) {
  // En phase UX : on ignore params.id et on utilise les fixtures
  const guide = guideData;
  const products = productsData;

  const stepLabels = {
    done: "✅",
    in_progress: "⏳",
    locked: "🔒",
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">
          <a href="/guides" className="hover:underline">← Guides</a>
          {" / "}
          {guide.title}
        </p>
        <h1 className="text-xl font-semibold">{guide.title}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {stepLabels[guide.steps.guide.status]} Guide créé &nbsp;·&nbsp;
          {stepLabels[guide.steps.products.status]} Produits &nbsp;·&nbsp;
          {stepLabels[guide.steps.plan.status]} Plan &nbsp;·&nbsp;
          {stepLabels[guide.steps.article.status]} Article
        </p>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="products">Produits</TabsTrigger>
          <TabsTrigger
            value="plan"
            disabled={guide.steps.plan.status === "locked"}
          >
            Plan
          </TabsTrigger>
          <TabsTrigger
            value="article"
            disabled={guide.steps.article.status === "locked"}
          >
            Article
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <TabOverview data={guide} onTabChange={() => {}} />
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <TabProducts products={products as any} />
        </TabsContent>

        <TabsContent value="plan" className="mt-6">
          <TabPlan
            initialHtml={planData.html}
            seoScore={guide.planSeoScore}
            seoKeywords={scoreData.keywords}
            meta={{
              slug: guide.slug,
              metaTitle: guide.metaTitle,
              metaDescription: guide.metaDescription,
              imageCaption: guide.imageCaption,
            }}
          />
        </TabsContent>

        <TabsContent value="article" className="mt-6">
          <TabArticle
            initialHtml={articleData.html}
            seoScore={guide.articleSeoScore}
            seoKeywords={[]}
            meta={{
              slug: guide.slug,
              metaTitle: guide.metaTitle,
              metaDescription: guide.metaDescription,
              imageCaption: guide.imageCaption,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Step 3: Vérifier que la page compile**

```bash
npm run dev
```

Ouvrir `http://localhost:3000/guides/fixture-guide-1` et vérifier que les 4 onglets s'affichent.

**Step 4: Commit**

```bash
git add src/app/guides/[id]/page.tsx
git commit -m "feat: refactor guide detail page with 4-tab layout and fixture data"
```

---

## Récapitulatif des commits

| # | Commit |
|---|--------|
| 1 | `feat: add fixture data for guide editor UX` |
| 2 | `feat: install TipTap WYSIWYG editor` |
| 3 | `feat: add TipTap RichEditor component` |
| 4 | `feat: add SeoScoreBar component` |
| 5 | `feat: add MetaFields component` |
| 6 | `feat: add TabOverview component` |
| 7 | `feat: add TabProducts component` |
| 8 | `feat: add TabPlan component with WYSIWYG and SEO score` |
| 9 | `feat: add TabArticle component with WYSIWYG and SEO score` |
| 10 | `feat: refactor guide detail page with 4-tab layout and fixture data` |

## Ce qui reste pour la phase suivante

- Migration Prisma (nouveaux champs sur Guide)
- API routes : `/api/guides/[id]/plan`, `/api/guides/[id]/article`
- Intégration GPT-4o pour génération plan + article
- Intégration score Serpmantics réel (`POST /api/serpmantics/score`)
- Remplacer les fixtures par les vraies données DB
