"use client";

import { useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadImageButtonProps {
  imageUrl: string;
  fileName: string;
}

export function DownloadImageButton({ imageUrl, fileName }: DownloadImageButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const handleDownload = async () => {
    try {
      setStatus("loading");
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const ext = blob.type.includes("png") ? ".png" : blob.type.includes("webp") ? ".webp" : ".jpg";
      const safeName = fileName.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("idle");
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={status === "loading"}>
      {status === "loading" ? (
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
      ) : status === "done" ? (
        <Check className="mr-2 h-3.5 w-3.5 text-green-600" />
      ) : (
        <Download className="mr-2 h-3.5 w-3.5" />
      )}
      Telecharger l&apos;image
    </Button>
  );
}
