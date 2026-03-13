"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Trash2, RefreshCw } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { GuideProgress } from "@/components/guides/guide-progress";
import { GuideResults } from "@/components/guides/guide-results";
import { useGuideGeneration } from "@/hooks/use-guide-generation";
import { formatCost } from "@/lib/pricing";

interface GuideData {
  id: string;
  title: string;
  status: string;
  errorMessage: string;
  totalCost: number;
  media: { id: string; name: string };
  products: {
    id: string;
    position: number;
    intelligence: {
      id: string;
      asin: string;
      productTitle: string;
      productBrand: string;
      productPrice: string;
      productImageUrl: string;
      analyzed: boolean;
      createdAt: string;
    };
    generatedCard: {
      id: string;
      keyword: string;
      wordCount: number;
      contentHtml: string;
    } | null;
  }[];
  keywords: {
    id: string;
    keyword: string;
    minOccurrences: number;
    maxOccurrences: number;
  }[];
  createdAt: string;
}

export default function GuideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const guideId = params.id as string;

  const [guide, setGuide] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const gen = useGuideGeneration();

  const fetchGuide = useCallback(async () => {
    const res = await fetch(`/api/guides/${guideId}`);
    if (res.ok) {
      const data = await res.json();
      setGuide(data);
    }
    setLoading(false);
  }, [guideId]);

  useEffect(() => {
    fetchGuide();
  }, [fetchGuide]);

  // Refresh guide data when generation completes
  useEffect(() => {
    if (gen.step === "complete") {
      fetchGuide();
    }
  }, [gen.step, fetchGuide]);

  const handleGenerate = async () => {
    gen.reset();
    await gen.startGeneration(guideId);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/guides/${guideId}`, { method: "DELETE" });
    router.push("/guides");
  };

  if (loading) {
    return (
      <>
        <Header title="Guide" />
        <main className="p-6">
          <p className="text-muted-foreground">Chargement...</p>
        </main>
      </>
    );
  }

  if (!guide) {
    return (
      <>
        <Header title="Guide introuvable" />
        <main className="p-6">
          <p className="text-muted-foreground">Ce guide n&apos;existe pas.</p>
        </main>
      </>
    );
  }

  const canGenerate = guide.status === "draft" || guide.status === "error" || guide.status === "complete";
  const isGenerating = gen.step !== "idle" && gen.step !== "complete" && gen.step !== "error";

  // Product cards for results
  const productCards = guide.products
    .filter((p) => p.generatedCard)
    .map((p) => ({
      id: p.generatedCard!.id,
      keyword: p.generatedCard!.keyword,
      wordCount: p.generatedCard!.wordCount,
      contentHtml: p.generatedCard!.contentHtml,
      intelligence: {
        id: p.intelligence.id,
        productTitle: p.intelligence.productTitle,
        productImageUrl: p.intelligence.productImageUrl,
      },
    }));

  return (
    <>
      <Header title="Guide">
        <Button variant="outline" size="sm" asChild>
          <Link href="/guides">
            <ArrowLeft className="mr-2 h-3 w-3" />
            Retour
          </Link>
        </Button>
        {canGenerate && !isGenerating && (
          <Button size="sm" onClick={handleGenerate}>
            {guide.status === "complete" ? (
              <RefreshCw className="mr-2 h-3 w-3" />
            ) : (
              <Play className="mr-2 h-3 w-3" />
            )}
            {guide.status === "complete" ? "Re-generer" : "Generer"}
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="mr-2 h-3 w-3" />
          Supprimer
        </Button>
      </Header>

      <main className="p-6 space-y-6 max-w-5xl">
        {/* Guide Info */}
        <Card>
          <CardHeader>
            <CardTitle>{guide.title}</CardTitle>
            <CardDescription>
              Media : {guide.media.name} — {guide.products.length} produits — {guide.keywords.length} mots-cles
            </CardDescription>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge
                variant={
                  guide.status === "complete"
                    ? "default"
                    : guide.status === "error"
                      ? "destructive"
                      : "secondary"
                }
              >
                {guide.status === "complete" ? "Termine" : guide.status === "error" ? "Erreur" : guide.status === "draft" ? "Brouillon" : "En cours"}
              </Badge>
              {guide.totalCost > 0 && (
                <Badge variant="outline" className="font-mono">
                  {formatCost(guide.totalCost)}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Cree le{" "}
                {new Date(guide.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </CardHeader>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Produits ({guide.products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {guide.products.map((p) => {
                const intel = p.intelligence;
                const ageMs = Date.now() - new Date(intel.createdAt).getTime();
                const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
                const isFresh = ageDays < 180;

                return (
                  <Link
                    key={p.id}
                    href={`/intelligence/${intel.id}`}
                    className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground w-5 text-right">
                      {p.position}.
                    </span>
                    {intel.productImageUrl ? (
                      <img
                        src={intel.productImageUrl}
                        alt={intel.productTitle}
                        className="w-10 h-10 object-contain rounded border bg-white flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded border bg-muted flex-shrink-0 flex items-center justify-center text-[10px] text-muted-foreground">
                        ?
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">
                        {intel.productTitle || intel.asin}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {intel.analyzed ? (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            Analyse
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Non analyse
                          </Badge>
                        )}
                        <Badge
                          variant={isFresh ? "outline" : "destructive"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {ageDays < 30 ? "Frais" : ageDays < 180 ? `${ageDays}j` : "Ancien"}
                        </Badge>
                        {intel.productPrice && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {intel.productPrice}
                          </span>
                        )}
                      </div>
                    </div>
                    {p.generatedCard && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                        Fiche generee
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Generation Progress */}
        {isGenerating && (
          <GuideProgress
            currentStep={gen.step}
            currentProduct={gen.currentProduct}
            totalProducts={gen.totalProducts}
            error={gen.error}
          />
        )}

        {/* Error from last generation attempt */}
        {gen.step === "error" && gen.error && (
          <GuideProgress
            currentStep="error"
            currentProduct={0}
            totalProducts={0}
            error={gen.error}
          />
        )}

        {/* Results: title + product cards */}
        {productCards.length > 0 && (
          <GuideResults
            guideTitle={guide.title}
            productCards={productCards}
          />
        )}
      </main>
    </>
  );
}
