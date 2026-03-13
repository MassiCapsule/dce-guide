"use client";

import { useState, useCallback, useRef } from "react";

export type GuideGenerationStep =
  | "idle"
  | "scraping"
  | "analyzing"
  | "distributing"
  | "generating"
  | "complete"
  | "error";

export interface UseGuideGenerationReturn {
  step: GuideGenerationStep;
  currentProduct: number;
  totalProducts: number;
  error: string | null;
  startGeneration: (guideId: string) => Promise<void>;
  reset: () => void;
}

export function useGuideGeneration(): UseGuideGenerationReturn {
  const [step, setStep] = useState<GuideGenerationStep>("idle");
  const [currentProduct, setCurrentProduct] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setStep("idle");
    setCurrentProduct(0);
    setTotalProducts(0);
    setError(null);
  }, [stopPolling]);

  const startGeneration = useCallback(
    async (guideId: string) => {
      try {
        reset();
        setStep("scraping");

        // Trigger the pipeline
        const res = await fetch(`/api/guides/${guideId}/generate`, {
          method: "POST",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur demarrage pipeline");
        }

        // Poll status until complete or error
        await new Promise<void>((resolve, reject) => {
          pollingRef.current = setInterval(async () => {
            try {
              const statusRes = await fetch(`/api/guides/${guideId}/status`);
              if (!statusRes.ok) return;

              const status = await statusRes.json();
              setCurrentProduct(status.currentStep);
              setTotalProducts(status.totalProducts);

              if (status.status === "error") {
                stopPolling();
                reject(new Error(status.errorMessage || "Erreur pipeline"));
                return;
              }

              if (status.status === "complete") {
                stopPolling();
                setStep("complete");
                resolve();
                return;
              }

              setStep(status.status as GuideGenerationStep);
            } catch {
              // Polling error, continue
            }
          }, 2000);
        });
      } catch (err: any) {
        stopPolling();
        setError(err.message || "Erreur inconnue");
        setStep("error");
      }
    },
    [reset, stopPolling]
  );

  return {
    step,
    currentProduct,
    totalProducts,
    error,
    startGeneration,
    reset,
  };
}
