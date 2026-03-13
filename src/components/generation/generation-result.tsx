"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HtmlViewer } from "@/components/html-viewer";

interface GenerationResultProps {
  html: string;
  wordCount: number;
}

export function GenerationResult({ html, wordCount }: GenerationResultProps) {
  if (!html) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resultat</CardTitle>
      </CardHeader>
      <CardContent>
        <HtmlViewer html={html} wordCount={wordCount} />
      </CardContent>
    </Card>
  );
}
