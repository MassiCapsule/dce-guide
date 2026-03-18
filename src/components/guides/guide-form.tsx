"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MediaItem {
  id: string;
  name: string;
}

export function GuideForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [medias, setMedias] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serpLoading, setSerpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serpFailed, setSerpFailed] = useState(false);

  useEffect(() => {
    fetch("/api/medias")
      .then((r) => r.json())
      .then(setMedias);
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (!title.trim()) {
      setError("Le mot clé principal est requis");
      return;
    }
    if (!mediaId) {
      setError("Selectionnez un media");
      return;
    }

    setSubmitting(true);
    setSerpLoading(true);
    setSerpFailed(false);

    // Etape 1 : recuperer les mots-cles via Serpmantics (~1-2 min)
    let keywords: { keyword: string; min: number; max: number }[] = [];
    let wordCountMin = 0;
    let wordCountMax = 0;
    let serpanticsGuideId = "";
    try {
      const serpRes = await fetch("/api/serpmantics/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: title, mediaName: medias.find((m) => m.id === mediaId)?.name ?? "" }),
      });
      if (!serpRes.ok) {
        const data = await serpRes.json();
        throw new Error(data.error || "Erreur Serpmantics");
      }
      const serpData = await serpRes.json();
      if (!serpData.keywords?.length) {
        throw new Error("Aucun mot-cle retourne par Serpmantics");
      }
      keywords = serpData.keywords;
      wordCountMin = serpData.wordCountMin ?? 0;
      wordCountMax = serpData.wordCountMax ?? 0;
      serpanticsGuideId = serpData.serpanticsGuideId ?? "";
    } catch (e: any) {
      setError(e.message || "Erreur Serpmantics");
      setSerpFailed(true);
      setSubmitting(false);
      setSerpLoading(false);
      return;
    }

    setSerpLoading(false);

    // Etape 2 : creer le guide avec les mots-cles
    try {
      const res = await fetch("/api/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          mediaId,
          keywords: keywords.map((k) => ({
            keyword: k.keyword.trim(),
            min: k.min,
            max: k.max,
          })),
          wordCountMin,
          wordCountMax,
          serpanticsGuideId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur creation guide");
      }

      const guide = await res.json();
      router.push(`/guides/${guide.id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const buttonLabel = () => {
    if (serpLoading) return "Analyse Serpmantics... (peut prendre plusieurs minutes)";
    if (submitting) return "Creation en cours...";
    if (serpFailed) return "Réessayer Serpmantics";
    return "Creer le guide";
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Title + Media */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations du guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Mot clé principal</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Meilleurs seche-cheveux 2025"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Media editorial</Label>
            <Select value={mediaId} onValueChange={setMediaId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un media..." />
              </SelectTrigger>
              <SelectContent>
                {medias.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error + Submit */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {buttonLabel()}
      </Button>
    </div>
  );
}
