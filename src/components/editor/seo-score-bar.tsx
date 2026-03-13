"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface SeoKeyword {
  expression: string;
  target: number;
  current: number;
  ok: boolean;
}

interface SeoScoreBarProps {
  score: number | null;
  keywords?: SeoKeyword[];
  onRecalculate?: () => void;
  loading?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

export function SeoScoreBar({
  score,
  keywords = [],
  onRecalculate,
  loading = false,
}: SeoScoreBarProps) {
  return (
    <div className="border rounded-md p-4 space-y-3 bg-muted/20">
      {/* Top row */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground shrink-0">
          Score SEO Serpmantics
        </span>

        {score === null ? (
          <span className="text-sm text-muted-foreground italic">
            Non calculé
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", getScoreColor(score))}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
            <span className={cn("text-sm font-semibold tabular-nums", getScoreTextColor(score))}>
              {score} / 100
            </span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onRecalculate}
          disabled={loading}
          className="ml-auto"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")}
          />
          Recalculer
        </Button>
      </div>

      {/* Keyword pills */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((kw) => (
            <span
              key={kw.expression}
              className={cn(
                "text-xs px-2 py-0.5 rounded-full border",
                kw.ok
                  ? "border-green-400 bg-green-50 text-green-700"
                  : "border-red-400 bg-red-50 text-red-700"
              )}
            >
              {kw.ok ? "✓" : "✗"} {kw.expression} ({kw.current}/{kw.target})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
