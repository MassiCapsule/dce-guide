"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, Lock, Plus } from "lucide-react";

interface StepStatus {
  status: "done" | "in_progress" | "locked";
  date: string | null;
}

interface GuideKeyword {
  keyword: string;
  min: number;
  max: number;
}

interface GuideOverviewData {
  keyword: string;
  wordCountMin: number;
  wordCountMax: number;
  selectionCriteria: string;
  keywords: GuideKeyword[];
  steps: {
    guide: StepStatus;
    products: StepStatus;
    plan: StepStatus;
    article: StepStatus;
    articleV2: StepStatus;
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
  { key: "articleV2", label: "Article humanisé", tab: "article" },
] as const;

export function TabOverview({ data, onTabChange }: TabOverviewProps) {
  const [keywordsOpen, setKeywordsOpen] = useState(false);

  const avgWordCount = Math.round(((data.wordCountMin + data.wordCountMax) / 2) / 100) * 100;
  const recommendedProducts = data.wordCountMin > 0 ? Math.ceil(avgWordCount / 300) : null;

  return (
    <div className="max-w-2xl space-y-4">
      {/* Card 1 — Informations du guide */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Mot-clé principal</span>
            <span className="font-medium">{data.keyword}</span>
          </div>
          {data.wordCountMin > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span>Nb mots min / max</span>
                <span className="font-medium">
                  {data.wordCountMin.toLocaleString()} / {data.wordCountMax.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Moyenne cible</span>
                <span className="font-medium">{avgWordCount.toLocaleString()} mots</span>
              </div>
              {recommendedProducts !== null && (
                <div className="flex justify-between text-sm">
                  <span>Produits recommandés</span>
                  <span className="font-medium">{recommendedProducts}</span>
                </div>
              )}
            </>
          )}
          {data.keywords.length > 0 && (
            <>
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground pt-1"
                onClick={() => setKeywordsOpen((v) => !v)}
              >
                {keywordsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {keywordsOpen ? "Masquer la liste" : "Voir la liste des mots-clés"}
              </button>
              {keywordsOpen && (
                <div className="mt-2 rounded-md border text-xs overflow-hidden">
                  <div className="grid grid-cols-3 bg-muted px-3 py-1.5 font-medium text-muted-foreground">
                    <span>Mot-clé</span>
                    <span className="text-right">Min</span>
                    <span className="text-right">Max</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y">
                    {data.keywords.map((k) => (
                      <div key={k.keyword} className="grid grid-cols-3 px-3 py-1.5">
                        <span className="truncate">{k.keyword}</span>
                        <span className="text-right text-muted-foreground">{k.min}</span>
                        <span className="text-right text-muted-foreground">{k.max}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bouton raccourci vers l'onglet Produits */}
      {data.steps.products.status !== "done" && (
        <Button
          className="w-full"
          onClick={() => onTabChange("products")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter des produits
        </Button>
      )}

      {/* Card 2 — Progression */}
      <Card>
        <CardHeader>
          <CardTitle>Progression</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {STEPS.map((step) => {
            const stepData = data.steps[step.key];
            const { status, date } = stepData;

            return (
              <div key={step.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {status === "done" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {status === "in_progress" && (
                    <Clock className="h-4 w-4 animate-pulse text-yellow-500" />
                  )}
                  {status === "locked" && (
                    <Lock className={cn("h-4 w-4 text-muted-foreground")} />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm">{step.label}</span>
                    {date && (
                      <span className="text-xs text-muted-foreground">
                        {date}
                      </span>
                    )}
                  </div>
                </div>

                {step.tab !== null && status !== "locked" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onTabChange(step.tab as string)}
                  >
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
