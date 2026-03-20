"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { SeoScoreBar } from "@/components/editor/seo-score-bar";
import { MetaFields } from "@/components/editor/meta-fields";
import { RichEditor } from "@/components/editor/rich-editor";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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

type GenerationPhase = "idle" | "distributing" | "generating" | "summarizing" | "enriching" | "complete";

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
  const [phase, setPhase] = useState<GenerationPhase>("idle");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [totalProducts, setTotalProducts] = useState<number>(0);
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

  const handleSaveMeta = async () => {
    await fetch(`/api/guides/${guideId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meta),
    });
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

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    setPhase("distributing");
    setCurrentStep(0);

    const res = await fetch(`/api/guides/${guideId}/article`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setGenerateError(data.error || "Erreur démarrage");
      setGenerating(false);
      setPhase("idle");
      return;
    }

    // Polling toutes les 3s
    pollRef.current = setInterval(async () => {
      const pollRes = await fetch(`/api/guides/${guideId}/status`);
      if (!pollRes.ok) return;
      const data = await pollRes.json();

      if (data.totalProducts) setTotalProducts(data.totalProducts);

      if (data.status === "distributing") {
        setPhase("distributing");
      } else if (data.status === "generating") {
        setPhase("generating");
        setCurrentStep(data.currentStep || 0);
      } else if (data.status === "summarizing") {
        setPhase("summarizing");
      } else if (data.status === "enriching") {
        setPhase("enriching");
      } else if (data.status === "complete") {
        setPhase("complete");
        setGenerating(false);
        stopPolling();
        const guideRes = await fetch(`/api/guides/${guideId}`);
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
        setTimeout(() => setPhase("idle"), 1500);
        onRefresh();
      } else if (data.status === "error") {
        setGenerateError(data.errorMessage || "Erreur inconnue");
        setGenerating(false);
        setPhase("idle");
        stopPolling();
      }
    }, 3000);
  }

  return (
    <div className="space-y-4 pb-20">
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
            <div className="px-4 pb-3">
              <Button variant="outline" size="sm" onClick={handleSaveMeta}>
                Sauvegarder
              </Button>
            </div>
          </div>
        )}
      </div>

      <RichEditor content={html} onChange={setHtml} />

      {/* Bouton flottant sticky en bas */}
      <div className="sticky bottom-0 z-10 -mx-6 px-6 py-3 bg-background/95 backdrop-blur-sm border-t">
        {/* Barre de progression */}
        {generating && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                {getProgressLabel()}
              </span>
              <span className="text-muted-foreground">{getProgressPercent()}%</span>
            </div>
            <Progress value={getProgressPercent()} className="h-2" />
          </div>
        )}

        {generateError && (
          <p className="text-sm text-red-600 mb-2">{generateError}</p>
        )}

        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Génération en cours…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Générer l&apos;article (IA)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
