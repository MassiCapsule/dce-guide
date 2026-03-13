"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { SeoScoreBar } from "@/components/editor/seo-score-bar";
import { RichEditor } from "@/components/editor/rich-editor";
import { Button } from "@/components/ui/button";

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
}

export function TabPlan({
  initialHtml,
  seoScore,
  seoKeywords,
}: TabPlanProps) {
  const [html, setHtml] = useState<string>(initialHtml);
  const [score, setScore] = useState<number | null>(seoScore);
  const [keywords, setKeywords] = useState<SeoKeyword[]>(seoKeywords);
  const [scoreLoading, setScoreLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  const handleRecalculate = async () => {
    setScoreLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setScore(74);
    setScoreLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
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

      <RichEditor content={html} onChange={setHtml} />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Génération en cours...
            </>
          ) : (
            "Générer le plan (IA)"
          )}
        </Button>

        <Button>Valider le plan →</Button>
      </div>
    </div>
  );
}
