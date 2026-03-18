"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

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
  onKeywordClick?: (keyword: string) => void;
  loading?: boolean;
  disabled?: boolean;
  serpanticsUrl?: string;
}

function getScoreColor(score: number): string {
  if (score > 80) return "bg-red-500";
  if (score >= 71) return "bg-orange-400";
  if (score >= 41) return "bg-green-500";
  if (score >= 21) return "bg-orange-400";
  return "bg-red-500";
}

function getScoreTextColor(score: number): string {
  if (score > 80) return "text-red-600";
  if (score >= 71) return "text-orange-500";
  if (score >= 41) return "text-green-600";
  if (score >= 21) return "text-orange-500";
  return "text-red-600";
}

export function SeoScoreBar({
  score,
  keywords = [],
  onRecalculate,
  onKeywordClick,
  loading = false,
  disabled = false,
  serpanticsUrl,
}: SeoScoreBarProps) {
  const [kwOpen, setKwOpen] = useState(false);

  return (
    <div className="border rounded-md p-4 space-y-3 bg-muted/20">
      {/* Top row */}
      <div className="flex items-center gap-4 flex-wrap">
        {serpanticsUrl ? (
          <a
            href={serpanticsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground hover:text-foreground underline-offset-2 hover:underline shrink-0"
          >
            Score SEO Serpmantics ↗
          </a>
        ) : (
          <span className="text-sm font-medium text-muted-foreground shrink-0">
            Score SEO Serpmantics
          </span>
        )}

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
          disabled={loading || disabled}
          className="ml-auto"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")}
          />
          Recalculer
        </Button>
      </div>

      {/* Keyword pills collapsible — mots-clés à 0 occurrences uniquement */}
      {keywords.length > 0 && (() => {
        const missing = keywords.filter((k) => k.current === 0);
        if (missing.length === 0) return null;
        return (
          <div>
            <button
              type="button"
              onClick={() => setKwOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {kwOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {missing.length} mot{missing.length > 1 ? "s-clés" : "-clé"} à 0 occurrence{missing.length > 1 ? "s" : ""}
            </button>
            {kwOpen && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {missing.map((kw) => (
                  <button
                    key={kw.expression}
                    type="button"
                    onClick={() => onKeywordClick?.(kw.expression)}
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border border-red-400 bg-red-50 text-red-700",
                      onKeywordClick && "cursor-pointer hover:bg-red-100"
                    )}
                    title={onKeywordClick ? "Cliquer pour insérer dans le plan" : undefined}
                  >
                    ✗ {kw.expression} (0/{kw.target})
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
