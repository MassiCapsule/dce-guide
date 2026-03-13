"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Eye, Code, Check, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HtmlViewerProps {
  html: string;
  wordCount: number;
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightHtml(raw: string) {
  return raw
    .replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="html-tag">$2</span>')
    .replace(/([\w-]+)(=)(&quot;)/g, '<span class="html-attr">$1</span>$2$3')
    .replace(/(&quot;)(.*?)(&quot;)/g, '$1<span class="html-str">$2</span>$3');
}

/** Strip <hr> and <img> tags from HTML content */
function cleanContent(html: string): string {
  return html
    .replace(/<hr\s*\/?>/gi, "")
    .replace(/<img\s[^>]*\/?>/gi, "");
}

export function HtmlViewer({ html, wordCount }: HtmlViewerProps) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Clean HTML: remove <hr> separators
  const cleanHtml = cleanContent(html);

  // Copy directly from iframe rendered content — same as manual Ctrl+A / Ctrl+C
  const copyFormatted = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const iframeDoc = iframe.contentDocument;
    const iframeWin = iframe.contentWindow;
    if (!iframeDoc || !iframeWin) return;

    const range = iframeDoc.createRange();
    range.selectNodeContents(iframeDoc.body);
    const sel = iframeWin.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    iframeDoc.execCommand("copy");
    if (sel) sel.removeAllRanges();

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Format the code for display
  const formatted = cleanHtml
    .replace(/></g, ">\n<")
    .replace(/(<\/(h[1-6]|p|div|ul|ol|li|section|article|header|footer|table|tr|blockquote)>)/gi, "$1\n")
    .replace(/(<(h[1-6]|section|article|header|footer|table|blockquote)[^>]*>)/gi, "\n$1");

  const escapedCode = escapeHtml(formatted);
  const highlighted = highlightHtml(escapedCode);

  // Sync iframe content — always keep iframe loaded for copy
  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.7;
    color: #1a1a1a;
    padding: 24px;
    max-width: 800px;
    margin: 0 auto;
    font-size: 15.5px;
  }
  h1 { font-size: 1.75em; margin: 0.8em 0 0.4em; color: #111; line-height: 1.3; font-weight: 700; }
  h2 { font-size: 1.35em; margin: 1.2em 0 0.4em; color: #222; border-bottom: 2px solid #f0f0f0; padding-bottom: 0.3em; font-weight: 600; }
  h3 { font-size: 1.1em; margin: 1em 0 0.3em; color: #333; font-weight: 600; }
  p { margin: 0.6em 0; }
  ul, ol { margin: 0.6em 0; padding-left: 1.5em; }
  li { margin: 0.25em 0; }
  strong { color: #111; font-weight: 600; }
  em { color: #555; }
  a { color: #2563eb; text-decoration: underline; }
  blockquote {
    border-left: 3px solid #e5e7eb;
    padding: 0.5em 1em;
    margin: 0.8em 0;
    color: #555;
    background: #fafafa;
    border-radius: 0 6px 6px 0;
  }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
  th { background: #f9fafb; font-weight: 600; }
  img { max-width: 100%; height: auto; border-radius: 8px; }
</style>
</head>
<body>${cleanHtml}</body>
</html>`);
    doc.close();
  }, [cleanHtml]);

  if (!html) return null;

  return (
    <div className={`flex flex-col border rounded-lg overflow-hidden bg-background ${fullscreen ? "fixed inset-4 z-50 shadow-2xl" : ""}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab("preview")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === "preview"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Apercu
          </button>
          <button
            onClick={() => setTab("code")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === "code"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            Code HTML
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            {wordCount} mots
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={copyFormatted}
          >
            {copied ? <Check className="mr-1 h-3 w-3 text-green-600" /> : <Copy className="mr-1 h-3 w-3" />}
            {copied ? "Copie !" : "Copier"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setFullscreen(!fullscreen)}
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Content — iframe always rendered for copy, hidden when code tab active */}
      <div className={`relative ${fullscreen ? "flex-1" : "min-h-[400px] max-h-[700px]"} overflow-auto`}>
        <iframe
          ref={iframeRef}
          title="Apercu HTML"
          className={`w-full h-full border-0 bg-white ${tab !== "preview" ? "sr-only" : ""}`}
          style={{ minHeight: fullscreen ? "100%" : 400 }}
          sandbox="allow-same-origin"
        />
        {tab === "code" && (
          <div className="relative">
            <pre className="p-4 text-[13px] leading-relaxed overflow-auto bg-[#1e1e2e] text-[#cdd6f4] font-mono">
              <code dangerouslySetInnerHTML={{ __html: highlighted }} />
            </pre>
            <style jsx>{`
              .html-tag { color: #89b4fa; }
              .html-attr { color: #f9e2af; }
              .html-str { color: #a6e3a1; }
            `}</style>
          </div>
        )}
      </div>

      {/* Fullscreen overlay backdrop */}
      {fullscreen && (
        <div
          className="fixed inset-0 bg-black/50 -z-10"
          onClick={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}
