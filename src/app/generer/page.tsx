"use client";

import { Header } from "@/components/layout/header";
import { GenerationForm } from "@/components/generation/generation-form";
import { GenerationProgress } from "@/components/generation/generation-progress";
import { GenerationResult } from "@/components/generation/generation-result";
import { useGeneration } from "@/hooks/use-generation";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export default function GenererPage() {
  const { step, streamedHtml, wordCount, error, generate, reset } =
    useGeneration();

  const isGenerating =
    step === "scraping" || step === "analyzing" || step === "generating";

  return (
    <>
      <Header title="Generer une fiche produit">
        {(step === "complete" || step === "error") && (
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="mr-2 h-3 w-3" />
            Nouvelle generation
          </Button>
        )}
      </Header>

      <main className="p-6 space-y-6 max-w-4xl">
        <GenerationForm onSubmit={generate} disabled={isGenerating} />

        {step !== "idle" && (
          <GenerationProgress currentStep={step} error={error} />
        )}

        {(step === "generating" || step === "complete") && streamedHtml && (
          <GenerationResult html={streamedHtml} wordCount={wordCount} />
        )}
      </main>
    </>
  );
}
