"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ChevronDown, ChevronUp, Sparkles, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface TabArticleV2Props {
  guideId: string;
  initialHtml: string;
  hasV1: boolean;
  seoScore: number | null;
  seoKeywords: SeoKeyword[];
  serpanticsUrl?: string;
  meta: {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    imageCaption: string;
  };
  h1Alternatives?: string[];
  initialHtmlV1?: string;
  onRefresh: () => void;
}

function extractH1(htmlStr: string): string {
  const match = htmlStr.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
}

function replaceH1(htmlStr: string, newH1: string): string {
  return htmlStr.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, `<h1>${newH1}</h1>`);
}

export function TabArticleV2({
  guideId,
  initialHtml,
  hasV1,
  seoScore,
  seoKeywords,
  serpanticsUrl,
  meta: metaProp,
  h1Alternatives = [],
  initialHtmlV1 = "",
  onRefresh,
}: TabArticleV2Props) {
  const [html, setHtml] = useState<string>(initialHtml);
  const [meta, setMeta] = useState(metaProp);
  const [currentH1, setCurrentH1] = useState<string>(extractH1(initialHtml));
  const [score, setScore] = useState<number | null>(seoScore);
  const [keywords, setKeywords] = useState<SeoKeyword[]>(seoKeywords);
  const [scoreLoading, setScoreLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [h1Open, setH1Open] = useState<boolean>(false);
  const [seoOpen, setSeoOpen] = useState<boolean>(false);
  const [v1Open, setV1Open] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-detect si humanisation en cours (lancée par V1)
  useEffect(() => {
    if (!initialHtml && hasV1) {
      // Pas de V2 mais V1 existe → vérifier si humanisation en cours
      (async () => {
        const res = await fetch(`/api/guides/${guideId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "humanizing") {
          setGenerating(true);
          setProgress(10);
          // Progression simulée
          let tick = 10;
          const progressInterval = setInterval(() => {
            tick = Math.min(tick + 3, 90);
            setProgress(tick);
          }, 2000);
          // Polling
          pollRef.current = setInterval(async () => {
            const pollRes = await fetch(`/api/guides/${guideId}/status`);
            if (!pollRes.ok) return;
            const d = await pollRes.json();
            if (d.status === "complete") {
              clearInterval(progressInterval);
              setProgress(100);
              setGenerating(false);
              stopPolling();
              const guideRes = await fetch(`/api/guides/${guideId}`);
              if (guideRes.ok) {
                const guide = await guideRes.json();
                setHtml(guide.guideHtmlV2 || "");
                setCurrentH1(extractH1(guide.guideHtmlV2 || ""));
              }
              setTimeout(() => setProgress(0), 1500);
              onRefresh();
            } else if (d.status === "error") {
              clearInterval(progressInterval);
              setGenerateError(d.errorMessage || "Erreur inconnue");
              setGenerating(false);
              setProgress(0);
              stopPolling();
            }
          }, 3000);
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setHtml(initialHtml);
    setCurrentH1(extractH1(initialHtml));
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

  const handleH1Change = (newH1: string) => {
    setCurrentH1(newH1);
    setHtml((prev) => replaceH1(prev, newH1));
  };

  const handleSaveMeta = async () => {
    await fetch(`/api/guides/${guideId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...meta, guideHtmlV2: html }),
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

  async function handleHumanize() {
    setGenerating(true);
    setGenerateError(null);
    setProgress(10);

    const res = await fetch(`/api/guides/${guideId}/humanize`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setGenerateError(data.error || "Erreur démarrage");
      setGenerating(false);
      setProgress(0);
      return;
    }

    // Progression simulée pendant l'attente (l'humanisation est un seul appel IA)
    let tick = 10;
    const progressInterval = setInterval(() => {
      tick = Math.min(tick + 3, 90);
      setProgress(tick);
    }, 2000);

    // Polling toutes les 3s
    pollRef.current = setInterval(async () => {
      const pollRes = await fetch(`/api/guides/${guideId}/status`);
      if (!pollRes.ok) return;
      const data = await pollRes.json();

      if (data.status === "complete") {
        clearInterval(progressInterval);
        setProgress(100);
        setGenerating(false);
        stopPolling();
        const guideRes = await fetch(`/api/guides/${guideId}`);
        if (guideRes.ok) {
          const guide = await guideRes.json();
          setHtml(guide.guideHtmlV2 || "");
          setCurrentH1(extractH1(guide.guideHtmlV2 || ""));
        }
        setTimeout(() => setProgress(0), 1500);
        onRefresh();
      } else if (data.status === "error") {
        clearInterval(progressInterval);
        setGenerateError(data.errorMessage || "Erreur inconnue");
        setGenerating(false);
        setProgress(0);
        stopPolling();
      }
    }, 3000);
  }

  async function handleRegenerateIntroFaq() {
    setRegenerating(true);
    setGenerateError(null);

    const res = await fetch(`/api/guides/${guideId}/regenerate-intro-faq`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "v2" }),
    });
    if (!res.ok) {
      const data = await res.json();
      setGenerateError(data.error || "Erreur démarrage");
      setRegenerating(false);
      return;
    }

    pollRef.current = setInterval(async () => {
      const pollRes = await fetch(`/api/guides/${guideId}/status`);
      if (!pollRes.ok) return;
      const data = await pollRes.json();

      if (data.status === "complete") {
        setRegenerating(false);
        stopPolling();
        const guideRes = await fetch(`/api/guides/${guideId}`);
        if (guideRes.ok) {
          const guide = await guideRes.json();
          setHtml(guide.guideHtmlV2 || "");
          setCurrentH1(extractH1(guide.guideHtmlV2 || ""));
        }
        onRefresh();
      } else if (data.status === "error") {
        setGenerateError(data.errorMessage || "Erreur inconnue");
        setRegenerating(false);
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

      {/* Collapsible H1 */}
      <div className="border rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => setH1Open((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-medium"
        >
          Titre H1
          {h1Open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {h1Open && (
          <div className="p-4 bg-muted/20 space-y-3">
            <div>
              <Label className="text-xs">Titre H1 actuel</Label>
              <Input
                value={currentH1}
                onChange={(e) => handleH1Change(e.target.value)}
                placeholder="Titre H1 de l'article"
                className="mt-1 text-sm font-medium"
              />
            </div>
            {h1Alternatives.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Propositions :</p>
                <div className="flex flex-col gap-1.5">
                  {h1Alternatives.map((alt, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left text-sm font-medium px-3 py-2 rounded-md border bg-background hover:bg-muted/60 transition-colors cursor-pointer"
                      onClick={() => handleH1Change(alt)}
                    >
                      {i + 1}. {alt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleSaveMeta}>
              Sauvegarder
            </Button>
          </div>
        )}
      </div>

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

      {/* Collapsible Article V1 */}
      {initialHtmlV1 && (
        <div className="border rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setV1Open((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-medium"
          >
            Article V1 (original)
            {v1Open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {v1Open && (
            <div className="p-4 bg-muted/20 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: initialHtmlV1 }} />
          )}
        </div>
      )}

      {/* Bouton flottant sticky en bas */}
      <div className="sticky bottom-0 z-10 -mx-6 px-6 py-3 bg-background/95 backdrop-blur-sm border-t">
        {/* Barre de progression */}
        {generating && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                Humanisation en cours…
              </span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {generateError && (
          <p className="text-sm text-red-600 mb-2">{generateError}</p>
        )}

        {!hasV1 && (
          <p className="text-sm text-muted-foreground mb-2">
            L&apos;article V1 doit être généré avant de pouvoir humaniser.
          </p>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleHumanize}
            disabled={generating || regenerating || !hasV1}
            className="flex-1"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Humanisation en cours…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Générer l&apos;article V2 (Humaniser)
            </>
          )}
          </Button>
          {hasV1 && (
            <Button
              onClick={handleRegenerateIntroFaq}
              disabled={generating || regenerating}
              variant="outline"
              size="lg"
            >
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Intro + FAQ</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
