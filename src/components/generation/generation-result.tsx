"use client";

import { Copy, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCopyHtml } from "@/hooks/use-copy-html";

interface GenerationResultProps {
  html: string;
  wordCount: number;
}

export function GenerationResult({ html, wordCount }: GenerationResultProps) {
  const { copied, copyHtml, copyText } = useCopyHtml();

  if (!html) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Resultat</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{wordCount} mots</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyHtml(html)}
          >
            <Copy className="mr-2 h-3 w-3" />
            {copied ? "Copie !" : "Copier le HTML"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyText(html)}
          >
            <FileText className="mr-2 h-3 w-3" />
            {copied ? "Copie !" : "Copier le texte"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="prose prose-sm max-w-none rounded-md border p-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </CardContent>
    </Card>
  );
}
