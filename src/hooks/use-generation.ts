"use client";

import { useState, useCallback } from "react";

export type GenerationStep =
  | "idle"
  | "scraping"
  | "analyzing"
  | "generating"
  | "complete"
  | "error";

export interface GenerationInput {
  asin: string;
  keyword: string;
  mediaId: string;
  wordCount: number;
}

export interface UseGenerationReturn {
  step: GenerationStep;
  streamedHtml: string;
  wordCount: number;
  error: string | null;
  generate: (input: GenerationInput) => Promise<void>;
  reset: () => void;
}

export function useGeneration(): UseGenerationReturn {
  const [step, setStep] = useState<GenerationStep>("idle");
  const [streamedHtml, setStreamedHtml] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("idle");
    setStreamedHtml("");
    setWordCount(0);
    setError(null);
  }, []);

  const generate = useCallback(async (input: GenerationInput) => {
    try {
      setError(null);
      setStreamedHtml("");
      setWordCount(0);

      // Step 1: Scraping
      setStep("scraping");
      const scrapeRes = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin: input.asin }),
      });

      if (!scrapeRes.ok) {
        const data = await scrapeRes.json();
        throw new Error(data.error || "Erreur lors du scraping Amazon");
      }

      const intelligence = await scrapeRes.json();

      // Step 2: Analyzing
      setStep("analyzing");
      const analyzeRes = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intelligenceId: intelligence.id }),
      });

      if (!analyzeRes.ok) {
        const data = await analyzeRes.json();
        throw new Error(data.error || "Erreur lors de l'analyse des avis");
      }

      // Step 3: Generating
      setStep("generating");
      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intelligenceId: intelligence.id,
          mediaId: input.mediaId,
          keyword: input.keyword,
          wordCount: input.wordCount,
        }),
      });

      if (!generateRes.ok) {
        const data = await generateRes.json();
        throw new Error(
          data.error || "Erreur lors de la generation de la fiche"
        );
      }

      // Read streaming response
      const reader = generateRes.body?.getReader();
      const decoder = new TextDecoder();
      let html = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          html += chunk;
          setStreamedHtml(html);
        }
      } else {
        // Fallback: non-streaming response
        const data = await generateRes.json();
        html = data.contentHtml || data.html || "";
        setStreamedHtml(html);
      }

      // Count words
      const textContent = html
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      setWordCount(
        textContent.split(/\s+/).filter((w: string) => w.length > 0).length
      );

      setStep("complete");
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
      setStep("error");
    }
  }, []);

  return { step, streamedHtml, wordCount, error, generate, reset };
}
