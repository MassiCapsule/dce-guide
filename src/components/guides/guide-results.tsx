"use client";

import { useMemo } from "react";
import { HtmlViewer } from "@/components/html-viewer";

interface ProductCard {
  id: string;
  keyword: string;
  wordCount: number;
  contentHtml: string;
  intelligence: {
    id: string;
    productTitle: string;
    productImageUrl: string;
  };
}

interface GuideResultsProps {
  guideTitle: string;
  productCards: ProductCard[];
}

export function GuideResults({
  guideTitle,
  productCards,
}: GuideResultsProps) {
  const { combinedHtml, totalWords } = useMemo(() => {
    const parts: string[] = [];
    parts.push(`<h1>${guideTitle}</h1>`);

    for (const card of productCards) {
      parts.push(card.contentHtml);
    }

    const html = parts.join("\n");
    const words = productCards.reduce((sum, c) => sum + c.wordCount, 0);
    return { combinedHtml: html, totalWords: words };
  }, [guideTitle, productCards]);

  return (
    <HtmlViewer html={combinedHtml} wordCount={totalWords} />
  );
}
