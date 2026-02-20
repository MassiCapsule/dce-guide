"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Media {
  id: string;
  name: string;
  defaultProductWordCount: number;
}

interface GenerationFormProps {
  onSubmit: (data: {
    asin: string;
    keyword: string;
    mediaId: string;
    wordCount: number;
  }) => void;
  disabled?: boolean;
}

export function GenerationForm({ onSubmit, disabled }: GenerationFormProps) {
  const [asin, setAsin] = useState("");
  const [keyword, setKeyword] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [wordCount, setWordCount] = useState(800);
  const [medias, setMedias] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMedias() {
      try {
        const res = await fetch("/api/medias");
        if (res.ok) {
          const data = await res.json();
          setMedias(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadMedias();
  }, []);

  function handleMediaChange(value: string) {
    setMediaId(value);
    const selected = medias.find((m) => m.id === value);
    if (selected) {
      setWordCount(selected.defaultProductWordCount);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ asin, keyword, mediaId, wordCount });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parametres de generation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asin">ASIN</Label>
            <Input
              id="asin"
              value={asin}
              onChange={(e) => setAsin(e.target.value)}
              placeholder="B0XXXXXXXXXX"
              required
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyword">Mot-cle SEO</Label>
            <Input
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="aspirateur robot silencieux"
              required
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="media">Media</Label>
            <Select
              value={mediaId}
              onValueChange={handleMediaChange}
              disabled={disabled || loading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loading ? "Chargement..." : "Selectionnez un media"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {medias.map((media) => (
                  <SelectItem key={media.id} value={media.id}>
                    {media.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loading && medias.length === 0 && (
              <p className="text-xs text-destructive">
                Aucun media disponible. Creez-en un d&apos;abord.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="wordCount">Nombre de mots</Label>
            <Input
              id="wordCount"
              type="number"
              value={wordCount}
              onChange={(e) => setWordCount(parseInt(e.target.value) || 0)}
              min={100}
              max={5000}
              disabled={disabled}
            />
          </div>

          <Button
            type="submit"
            disabled={disabled || !asin || !keyword || !mediaId}
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {disabled ? "Generation en cours..." : "Generer la fiche"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
