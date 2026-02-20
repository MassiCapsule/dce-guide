"use client";

import { Copy, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCopyHtml } from "@/hooks/use-copy-html";

interface ProductCardViewerProps {
  html: string;
  wordCount: number;
}

export function ProductCardViewer({ html, wordCount }: ProductCardViewerProps) {
  const { copied, copyHtml, copyText } = useCopyHtml();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{wordCount} mots</Badge>
        <Button variant="outline" size="sm" onClick={() => copyHtml(html)}>
          <Copy className="mr-2 h-3 w-3" />
          {copied ? "Copie !" : "Copier le HTML"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => copyText(html)}>
          <FileText className="mr-2 h-3 w-3" />
          {copied ? "Copie !" : "Copier le texte"}
        </Button>
      </div>

      <div
        className="prose prose-sm max-w-none rounded-md border p-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
