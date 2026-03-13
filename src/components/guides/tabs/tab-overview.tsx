"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Lock } from "lucide-react";

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

export function TabOverview({ data, onTabChange }: TabOverviewProps) {
  const [criteria, setCriteria] = useState(data.selectionCriteria);

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
          <div className="flex justify-between text-sm">
            <span>Nombre de mots cible</span>
            <span className="font-medium">
              {data.targetWordCount.toLocaleString()} mots
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 — Critères de sélection des produits */}
      <Card>
        <CardHeader>
          <CardTitle>Critères de sélection des produits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="criteria">Critères</Label>
            <Textarea
              id="criteria"
              rows={3}
              className="text-sm"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
            />
          </div>
          <Button size="sm" variant="outline">
            Sauvegarder
          </Button>
        </CardContent>
      </Card>

      {/* Card 3 — Progression */}
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
