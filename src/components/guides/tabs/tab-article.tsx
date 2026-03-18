"use client";

import { useState, useEffect, useRef } from "react";
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
  guideId: string;
  initialHtml: string;
  seoScore: number | null;
  seoKeywords: SeoKeyword[];
  serpanticsUrl?: string;
  meta: {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    imageCaption: string;
  };
  onRefresh: () => void;
}

export function TabArticle({
  guideId,
  initialHtml,
  seoScore,
  seoKeywords,
  serpanticsUrl,
  meta: metaProp,
  onRefresh,
}: TabArticleProps) {
  const [html, setHtml] = useState<string>(initialHtml);
  const [meta, setMeta] = useState(metaProp);
  const [score, setScore] = useState<number | null>(seoScore);
  const [keywords, setKeywords] = useState<SeoKeyword[]>(seoKeywords);
  const [scoreLoading, setScoreLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [seoOpen, setSeoOpen] = useState<boolean>(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync if parent reloads guide data
  useEffect(() => {
    setHtml(initialHtml);
  }, [initialHtml]);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  const handleMetaChange = (field: string, value: string) => {
    setMeta((prev) => ({ ...prev, [field]: value }));
  };

  const handleRecalculate = async () => {
    if (!html) return;
    setScoreLoading(true);
    try {
      const res = await fetch(`/api/guides/${guideId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: html }),
      });
      if (res.ok) {
        const data = await res.json();
        setScore(data.score);
        setKeywords(data.keywords);
      }
    } finally {
      setScoreLoading(false);
    }
  };

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);

    const res = await fetch(`/api/guides/${guideId}/article`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setGenerateError(data.error || "Erreur démarrage");
      setGenerating(false);
      return;
    }

    // Polling toutes les 3s
    pollRef.current = setInterval(async () => {
      const pollRes = await fetch(`/api/guides/${guideId}/status`);
      if (!pollRes.ok) return;
      const data = await pollRes.json();

      if (data.status === "complete") {
        setGenerating(false);
        stopPolling();
        const guideRes = await fetch(`/api/guides/${guideId}`);
        if (guideRes.ok) {
          const guide = await guideRes.json();
          setHtml(guide.guideHtml || "");
        }
        onRefresh();
      } else if (data.status === "error") {
        setGenerateError(data.errorMessage || "Erreur inconnue");
        setGenerating(false);
        stopPolling();
      }
    }, 3000);
  }

  return (
    <div className="space-y-4">
      <SeoScoreBar
        score={score}
        keywords={keywords}
        onRecalculate={() => handleRecalculate()}
        loading={scoreLoading}
        disabled={!html || !serpanticsUrl}
        serpanticsUrl={serpanticsUrl}
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

      <div className="flex items-center justify-end gap-2">
        {generateError && (
          <span className="text-xs text-red-600">{generateError}</span>
        )}
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Génération en cours…
            </>
          ) : (
            "Générer l'article (IA)"
          )}
        </Button>
      </div>
    </div>
  );
}
