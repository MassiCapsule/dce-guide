"use client";

import { Download, Brain, Sparkles, Check, Circle, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GenerationStep } from "@/hooks/use-generation";

interface GenerationProgressProps {
  currentStep: GenerationStep;
  error?: string | null;
}

const steps = [
  { key: "scraping" as const, label: "Scraping Amazon...", icon: Download },
  { key: "analyzing" as const, label: "Analyse des avis...", icon: Brain },
  { key: "generating" as const, label: "Generation de la fiche...", icon: Sparkles },
];

const stepOrder: Record<string, number> = {
  idle: -1,
  scraping: 0,
  analyzing: 1,
  generating: 2,
  complete: 3,
  error: -1,
};

export function GenerationProgress({
  currentStep,
  error,
}: GenerationProgressProps) {
  if (currentStep === "idle") return null;

  const currentIndex = stepOrder[currentStep] ?? -1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Progression</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.key;
            const isDone =
              currentStep === "complete" || currentIndex > index;
            const _isPending = currentIndex < index && currentStep !== "error";

            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {isDone ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Check className="h-4 w-4" />
                    </div>
                  ) : isActive ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 animate-pulse">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Circle className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-4 w-4 ${
                      isDone
                        ? "text-green-600"
                        : isActive
                          ? "text-blue-600"
                          : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      isDone
                        ? "text-green-600 font-medium"
                        : isActive
                          ? "text-blue-600 font-medium"
                          : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {currentStep === "error" && error && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {currentStep === "complete" && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3">
            <Check className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-600 font-medium">
              Fiche generee avec succes !
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
