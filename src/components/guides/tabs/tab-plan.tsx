"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ExternalLink, Sparkles } from "lucide-react";
import { SeoScoreBar } from "@/components/editor/seo-score-bar";
import { RichEditor } from "@/components/editor/rich-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface SeoKeyword {
  expression: string;
  target: number;
  current: number;
  ok: boolean;
}

interface TabPlanProps {
  guideId: string;
  initialHtml: string;
  initialCriteria: string;
  keyword: string;
  seoScore: number | null;
  seoKeywords: SeoKeyword[];
  serpanticsUrl?: string;
  onRefresh: () => void;
  onSaveCriteria: (criteria: string) => Promise<void>;
  onTabChange: (tab: string) => void;
}


export function TabPlan({ guideId, initialHtml, initialCriteria, keyword, seoScore, seoKeywords, serpanticsUrl, onRefresh, onSaveCriteria, onTabChange }: TabPlanProps) {
  const [html, setHtml] = useState<string>(initialHtml);
  const [criteria, setCriteria] = useState<string>(initialCriteria);
  const [criteresPrompt, setCriteresPrompt] = useState<string>("");
  const [generatingCriteria, setGeneratingCriteria] = useState(false);
  const [savingCriteria, setSavingCriteria] = useState(false);
  const [validating, setValidating] = useState(false);
  const [score, setScore] = useState<number | null>(seoScore);
  const [keywords, setKeywords] = useState<SeoKeyword[]>(seoKeywords);
  const [scoreLoading, setScoreLoading] = useState<boolean>(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync if parent reloads guide data
  useEffect(() => {
    setHtml(initialHtml);
  }, [initialHtml]);

  useEffect(() => {
    setCriteria(initialCriteria);
  }, [initialCriteria]);

  useEffect(() => {
    setScore(seoScore);
  }, [seoScore]);

  useEffect(() => {
    setKeywords(seoKeywords);
  }, [seoKeywords]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.prompt_criteres) {
          setCriteresPrompt(data.prompt_criteres);
        } else {
          fetch("/api/config/prompts")
            .then((r) => r.json())
            .then((defaults) => setCriteresPrompt(defaults.criteres ?? ""));
        }
      });
  }, []);

  const handleGenererCriteres = () => {
    const prompt = criteresPrompt.replaceAll("#MotClesprincipal", keyword);
    const url = `https://www.perplexity.ai/search?q=${encodeURIComponent(prompt)}`;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGenererCriteresAuto = async () => {
    setCriteria("");
    setGeneratingCriteria(true);
    try {
      const res = await fetch(`/api/guides/${guideId}/criteres-auto`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCriteria(data.criteria);
        await onSaveCriteria(data.criteria);
      } else {
        setCriteria(`Erreur : ${data.error || "Échec de la génération"}`);
      }
    } catch (err) {
      setCriteria(`Erreur réseau : ${err instanceof Error ? err.message : "inconnue"}`);
    } finally {
      setGeneratingCriteria(false);
    }
  };

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  const handleRecalculate = async (content?: string) => {
    const toScore = content ?? html;
    if (!toScore || scoreLoading) return;
    setScoreLoading(true);
    setScoreError(null);
    try {
      const res = await fetch(`/api/guides/${guideId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: toScore }),
      });
      const data = await res.json();
      if (res.ok) {
        setScore(data.score);
        setKeywords(data.keywords);
      } else {
        setScoreError(data.error || "Erreur Serpmantics");
      }
    } catch {
      setScoreError("Erreur réseau");
    } finally {
      setScoreLoading(false);
    }
  };

  async function handleGenerate() {
    if (!criteria.trim()) {
      setGenerateError("Les critères de sélection sont obligatoires pour générer le plan.");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    setProgress(10);

    // Sauvegarde automatique des critères avant génération
    await onSaveCriteria(criteria);

    const res = await fetch(`/api/guides/${guideId}/plan`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setGenerateError(data.error || "Erreur démarrage");
      setGenerating(false);
      setProgress(0);
      return;
    }

    // Progression simulée
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

      if (data.status === "plan-ready") {
        clearInterval(progressInterval);
        setProgress(100);
        setGenerating(false);
        stopPolling();
        // Fetch updated guide to get planHtml
        const guideRes = await fetch(`/api/guides/${guideId}`);
        if (guideRes.ok) {
          const guide = await guideRes.json();
          const planHtml = guide.planHtml || "";
          setHtml(planHtml);
          // Calcul automatique du score SEO
          if (planHtml) handleRecalculate(planHtml);
        }
        setTimeout(() => {
          setProgress(0);
          onTabChange("article");
        }, 1500);
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

  return (
    <div className="space-y-4 pb-20">
      {/* Critères de sélection des produits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Critères de sélection des produits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="criteria">Critères</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenererCriteresAuto}
                  disabled={generatingCriteria}
                >
                  {generatingCriteria ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-3 w-3" />
                  )}
                  {generatingCriteria ? "Génération…" : "Générer (IA)"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenererCriteres}
                >
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Perplexity
                </Button>
              </div>
            </div>
            <textarea
              id="criteria"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="Ex: 1. Autonomie — Privilégiez plus de 40 min..."
              className="w-full min-h-[120px] text-sm bg-muted p-3 rounded-md font-sans leading-relaxed resize-y border border-input focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      <SeoScoreBar
        score={score}
        keywords={keywords}
        onRecalculate={() => handleRecalculate()}

        loading={scoreLoading}
        disabled={!html || !serpanticsUrl}
        serpanticsUrl={serpanticsUrl}
      />
      {scoreError && (
        <p className="text-xs text-red-600">{scoreError}</p>
      )}

      <RichEditor content={html} onChange={setHtml} />

      {/* Boutons sticky en bas */}
      <div className="sticky bottom-0 z-10 -mx-6 px-6 py-3 bg-background/95 backdrop-blur-sm border-t">
        {/* Barre de progression */}
        {generating && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération du plan en cours…
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
            className="flex-1"
            size="lg"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Générer le plan (IA)
              </>
            )}
          </Button>

          <Button
            size="lg"
            variant="outline"
            disabled={!html || validating}
            onClick={async () => {
              setValidating(true);
              await fetch(`/api/guides/${guideId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planHtml: html }),
              });
              onRefresh();
              setValidating(false);
              onTabChange("article");
            }}
          >
            {validating ? "Sauvegarde…" : "Valider le plan →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
