"use client";

import { HtmlViewer } from "@/components/html-viewer";

interface ProductCardViewerProps {
  html: string;
  wordCount: number;
}

export function ProductCardViewer({ html, wordCount }: ProductCardViewerProps) {
  return <HtmlViewer html={html} wordCount={wordCount} />;
}
