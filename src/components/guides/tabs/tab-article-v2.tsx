"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ChevronDown, ChevronUp, Sparkles, RefreshCw, Wand2 } from "lucide-react";
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

type Phase = "idle" | "distributing" | "generating" | "summarizing" | "enriching" | "humanizing" | "complete";

const PHASE_LABELS: Record<Phase, string> = {
  idle: "",
  distributing: "Lancement de la génération…",
  generating: "Génération des fiches…",
  summarizing: "Résumé de l'article…",
  enriching: "Enrichissements (intro, FAQ, méta)…",
  humanizing: "Humanisation en cours…",
  complete: "Terminé",
};

function phaseToProgress(phase: Phase, currentStep: number): number {
  switch (phase) {
    case "distributing": return 5;
    case "generating": return 10 + Math.min(currentStep * 8, 40);
    case "summarizing": return 55;
    case "enriching": return 65;
    case "humanizing": return 75;
    case "complete": return 100;
    default: return 0;
  }
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
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  // Auto-detect si génération ou humanisation en cours
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/guides/${guideId}/status`);
      if (!res.ok) return;
      const data = await res.json();
      const s = data.status as string;

      // V1 en cours ou humanisation en cours → reprendre le polling
      const v1Phases = ["distributing", "generating", "summarizing", "enriching"];
      if (v1Phases.includes(s) || s === "humanizing") {
        setGenerating(true);
        setPhase(s as Phase);
        setCurrentStep(data.currentStep || 0);
        setProgress(phaseToProgress(s as Phase, data.currentStep || 0));
        startPolling(s === "humanizing");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPolling(humanizePhase: boolean) {
    // Progression simulée pendant humanisation (pas de steps intermédiaires)
    if (humanizePhase) {
      let tick = 75;
      progressIntervalRef.current = setInterval(() => {
        tick = Math.min(tick + 2, 95);
        setProgress(tick);
      }, 2000);
    }

    pollRef.current = setInterval(async () => {
      const pollRes = await fetch(`/api/guides/${guideId}/status`);
      if (!pollRes.ok) return;
      const data = await pollRes.json();
      const s = data.status as string;

      if (s === "error") {
        setGenerateError(data.errorMessage || "Erreur inconnue");
        setGenerating(false);
        setPhase("idle");
        setProgress(0);
        stopPolling();
        return;
      }

      if (s === "complete") {
        stopPolling();
        setPhase("complete");
        setProgress(100);
        const guideRes = await fetch(`/api/guides/${guideId}`);
        if (guideRes.ok) {
          const guide = await guideRes.json();
          // Si V2 existe, on l'affiche. Sinon, V1 vient de finir → lancer humanisation
          if (guide.guideHtmlV2) {
            setHtml(guide.guideHtmlV2);
            setCurrentH1(extractH1(guide.guideHtmlV2));
            setGenerating(false);
            setTimeout(() => setProgress(0), 1500);
            onRefresh();
          } else if (guide.guideHtml) {
            // V1 terminée, pas encore de V2 → lancer humanisation
            launchHumanize();
          }
        }
        return;
      }

      // Mise à jour phase V1
      const validPhases: Phase[] = ["distributing", "generating", "summarizing", "enriching", "humanizing"];
      if (validPhases.includes(s as Phase)) {
        setPhase(s as Phase);
        setCurrentStep(data.currentStep || 0);
        if (s !== "humanizing") {
          setProgress(phaseToProgress(s as Phase, data.currentStep || 0));
        }
      }
    }, 3000);
  }

  async function launchHumanize() {
    setPhase("humanizing");
    setProgress(75);

    const res = await fetch(`/api/guides/${guideId}/humanize`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setGenerateError(data.error || "Erreur démarrage humanisation");
      setGenerating(false);
      setPhase("idle");
      setProgress(0);
      return;
    }

    startPolling(true);
  }

  useEffect(() => {
    setHtml(initialHtml);
    setCurrentH1(extractH1(initialHtml));
  }, [initialHtml]);

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

  // Bouton principal : génère V1 puis V2
  async function handleGenerate() {
    // Vider les contenus existants pour repartir de zéro
    setHtml("");
    setCurrentH1("");
    setMeta({ slug: "", metaTitle: "", metaDescription: "", imageCaption: "" });
    setScore(null);
    setKeywords([]);
    setGenerating(true);
    setGenerateError(null);
    setPhase("distributing");
    setProgress(5);
    setCurrentStep(0);

    const res = await fetch(`/api/guides/${guideId}/article`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setGenerateError(data.error || "Erreur démarrage");
      setGenerating(false);
      setPhase("idle");
      setProgress(0);
      return;
    }

    startPolling(false);
  }

  // Bouton secondaire : humanise V1 existante
  async function handleHumanize() {
    setGenerating(true);
    setGenerateError(null);
    setPhase("humanizing");
    setProgress(75);

    const res = await fetch(`/api/guides/${guideId}/humanize`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setGenerateError(data.error || "Erreur démarrage");
      setGenerating(false);
      setPhase("idle");
      setProgress(0);
      return;
    }

    startPolling(true);
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

  const phaseLabel = phase === "generating" && currentStep > 0
    ? `Génération fiche ${currentStep}…`
    : PHASE_LABELS[phase];

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
                {phaseLabel}
              </span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {generateError && (
          <p className="text-sm text-red-600 mb-2">{generateError}</p>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generating || regenerating}
            className="flex-1"
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
                Générer l&apos;article
              </>
            )}
          </Button>
          {hasV1 && (
            <>
              <Button
                onClick={handleHumanize}
                disabled={generating || regenerating}
                variant="outline"
                size="lg"
                title="Ré-humaniser l'article V1 existant"
              >
                <Wand2 className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Humaniser</span>
              </Button>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
