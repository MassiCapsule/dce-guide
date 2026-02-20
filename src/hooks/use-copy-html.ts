"use client";

import { useState } from "react";

export function useCopyHtml() {
  const [copied, setCopied] = useState(false);

  const copyHtml = async (html: string) => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyText = async (html: string) => {
    const text = html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return { copied, copyHtml, copyText };
}
