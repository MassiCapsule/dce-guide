"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ClipboardPaste, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

interface ProductField {
  asin: string;
  existingTitle?: string;
}

interface KeywordField {
  keyword: string;
  min: number;
  max: number;
}

export function GuideForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [medias, setMedias] = useState<MediaItem[]>([]);
  const [products, setProducts] = useState<ProductField[]>([
    { asin: "" },
    { asin: "" },
    { asin: "" },
  ]);
  const [keywords, setKeywords] = useState<KeywordField[]>([
    { keyword: "", min: 3, max: 10 },
  ]);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serpLoading, setSerpLoading] = useState(false);
  const [serpError, setSerpError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/medias")
      .then((r) => r.json())
      .then(setMedias);
  }, []);

  const addProduct = () => {
    if (products.length < 10) {
      setProducts([...products, { asin: "" }]);
    }
  };

  const removeProduct = (index: number) => {
    if (products.length > 2) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index: number, asin: string) => {
    const updated = [...products];
    updated[index] = { ...updated[index], asin };
    setProducts(updated);
  };

  const addKeyword = () => {
    setKeywords([...keywords, { keyword: "", min: 3, max: 10 }]);
  };

  const removeKeyword = (index: number) => {
    if (keywords.length > 1) {
      setKeywords(keywords.filter((_, i) => i !== index));
    }
  };

  const updateKeyword = (index: number, field: keyof KeywordField, value: string | number) => {
    const updated = [...keywords];
    updated[index] = { ...updated[index], [field]: value };
    setKeywords(updated);
  };

  const handlePasteImport = () => {
    const lines = pasteText.trim().split("\n");
    const parsed: KeywordField[] = [];

    for (const line of lines) {
      const cols = line.split("\t");
      if (cols.length < 4) continue;

      const keyword = cols[0].trim();
      const min = parseInt(cols[2]);
      const max = parseInt(cols[3]);

      // Skip header row or invalid lines
      if (!keyword || isNaN(min) || isNaN(max)) continue;
      if (min <= 0 && max <= 0) continue;

      parsed.push({ keyword, min, max });
    }

    if (parsed.length > 0) {
      setKeywords(parsed);
      setPasteText("");
      setShowPaste(false);
    }
  };

  const handleSerpValidate = async () => {
    if (!title.trim()) return;
    setSerpLoading(true);
    setSerpError(null);
    try {
      const res = await fetch("/api/serpmantics/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: title }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur Serpmantics");
      }
      const data = await res.json();
      if (data.keywords?.length > 0) {
        setKeywords(data.keywords);
      } else {
        setSerpError("Aucun mot-cle retourne par Serpmantics");
      }
    } catch (e: any) {
      setSerpError(e.message || "Erreur Serpmantics");
    } finally {
      setSerpLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    const validProducts = products.filter((p) => p.asin.trim());
    const validKeywords = keywords.filter((k) => k.keyword.trim());

    if (!title.trim()) {
      setError("Le titre est requis");
      return;
    }
    if (!mediaId) {
      setError("Selectionnez un media");
      return;
    }
    if (validProducts.length < 2) {
      setError("Au moins 2 produits sont requis");
      return;
    }
    if (validKeywords.length < 1) {
      setError("Au moins 1 mot-cle est requis");
      return;
    }

    // Validate min <= max
    for (const k of validKeywords) {
      if (k.min > k.max) {
        setError(`Mot-cle "${k.keyword}" : min (${k.min}) > max (${k.max})`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          mediaId,
          products: validProducts.map((p) => ({ asin: p.asin.trim() })),
          keywords: validKeywords.map((k) => ({
            keyword: k.keyword.trim(),
            min: k.min,
            max: k.max,
          })),
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
            <div className="flex gap-2 mt-1">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Meilleurs seche-cheveux 2025"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSerpValidate}
                disabled={!title.trim() || serpLoading}
                className="shrink-0"
              >
                {serpLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Valider"
                )}
              </Button>
            </div>
            {serpError && (
              <p className="text-sm text-destructive mt-1">{serpError}</p>
            )}
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

      {/* Products */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Produits ({products.length}/10)
              </CardTitle>
              <CardDescription>
                Ajoutez les EAN (identifiants Amazon) des produits a comparer
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addProduct}
              disabled={products.length >= 10}
            >
              <Plus className="mr-1 h-3 w-3" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {products.map((product, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-6 text-right">
                {index + 1}.
              </span>
              <Input
                value={product.asin}
                onChange={(e) => updateProduct(index, e.target.value)}
                placeholder="Ex: B0DJMGK8XF"
                className="font-mono"
              />
              {products.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0"
                  onClick={() => removeProduct(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Keywords */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Mots-cles SEO ({keywords.filter((k) => k.keyword.trim()).length})
              </CardTitle>
              <CardDescription>
                Collez un tableau ou ajoutez manuellement
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPaste(!showPaste)}
              >
                <ClipboardPaste className="mr-1 h-3 w-3" />
                Coller
              </Button>
              <Button variant="outline" size="sm" onClick={addKeyword}>
                <Plus className="mr-1 h-3 w-3" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Paste zone */}
          {showPaste && (
            <div className="space-y-2 p-3 rounded-md border border-dashed bg-muted/30">
              <p className="text-xs text-muted-foreground">
                Collez le tableau (format : Expression / Occurrences / Min / Max, separe par tabulations)
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"robot\t0\t47\t92\nvitres\t0\t27\t84"}
                className="w-full h-32 text-xs font-mono p-2 rounded-md border bg-background resize-y"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handlePasteImport}
                  disabled={!pasteText.trim()}
                >
                  Importer {pasteText.trim() ? `(${pasteText.trim().split("\n").filter((l) => l.split("\t").length >= 4).length} lignes)` : ""}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowPaste(false); setPasteText(""); }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Keyword list */}
          <div className="grid grid-cols-[1fr_70px_70px_40px] gap-2 text-xs text-muted-foreground font-medium px-1">
            <span>Mot-cle</span>
            <span>Min</span>
            <span>Max</span>
            <span></span>
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {keywords.map((kw, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_70px_70px_40px] gap-2 items-center"
              >
                <Input
                  value={kw.keyword}
                  onChange={(e) => updateKeyword(index, "keyword", e.target.value)}
                  placeholder="Ex: seche-cheveux"
                  className="text-xs"
                />
                <Input
                  type="number"
                  min={1}
                  value={kw.min}
                  onChange={(e) =>
                    updateKeyword(index, "min", parseInt(e.target.value) || 1)
                  }
                  className="text-center text-xs"
                />
                <Input
                  type="number"
                  min={1}
                  value={kw.max}
                  onChange={(e) =>
                    updateKeyword(index, "max", parseInt(e.target.value) || 1)
                  }
                  className="text-center text-xs"
                />
                {keywords.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => removeKeyword(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <div />
                )}
              </div>
            ))}
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
        {submitting ? "Creation en cours..." : "Creer le guide"}
      </Button>
    </div>
  );
}
