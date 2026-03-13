"use client";

import { useState } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { SeoScoreBar } from "@/components/editor/seo-score-bar";
import { MetaFields } from "@/components/editor/meta-fields";
import { RichEditor } from "@/components/editor/rich-editor";
import { Button } from "@/components/ui/button";

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

export function TabArticle({
  initialHtml,
  seoScore,
  seoKeywords,
  meta: metaProp,
}: TabArticleProps) {
  const [html, setHtml] = useState<string>(initialHtml);
  const [meta, setMeta] = useState(metaProp);
  const [score, setScore] = useState<number | null>(seoScore);
  const [keywords, setKeywords] = useState<SeoKeyword[]>(seoKeywords);
  const [scoreLoading, setScoreLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [seoOpen, setSeoOpen] = useState<boolean>(false);

  const handleMetaChange = (field: string, value: string) => {
    setMeta((prev) => ({ ...prev, [field]: value }));
  };

  const handleRecalculate = async () => {
    setScoreLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setScore(85);
    setScoreLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 3000));
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

      {/* Collapsible Éléments SEO */}
      <div className="border rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => setSeoOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-medium"
        >
          Éléments SEO
          {seoOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {seoOpen && (
          <div className="bg-muted/20">
            <MetaFields
              slug={meta.slug}
              metaTitle={meta.metaTitle}
              metaDescription={meta.metaDescription}
              imageCaption={meta.imageCaption}
              onChange={handleMetaChange}
            />
          </div>
        )}
      </div>

      <RichEditor content={html} onChange={setHtml} />

      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Génération en cours...
            </>
          ) : (
            "Générer l'article (IA)"
          )}
        </Button>
      </div>
    </div>
  );
}
