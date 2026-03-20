"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle, Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Product {
  id: string;
  asin: string;
  title: string;
  brand: string;
  price: string;
  imageUrl: string;
  reviewCount: number;
  rating: number;
  status: "done" | "pending" | "error";
}

interface TabProductsProps {
  guideId: string;
  products: Product[];
  onRefresh: () => void;
}

const SCRAPING_STATUSES = ["scraping", "analyzing"];

type ScrapePhase = "idle" | "scraping" | "analyzing" | "done";

function StatusBadge({ status }: { status: Product["status"] }) {
  if (status === "done") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="w-3 h-3" />
        Récupéré
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="flex items-center gap-1 text-xs text-yellow-600">
        <Clock className="w-3 h-3" />
        En attente
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="w-3 h-3" />
      Erreur
    </span>
  );
}

export function TabProducts({ guideId, products, onRefresh }: TabProductsProps) {
  const [asinInput, setAsinInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [phase, setPhase] = useState<ScrapePhase>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  function getProgressPercent(): number {
    if (totalProducts === 0) return 0;
    if (phase === "scraping") {
      return Math.round((currentStep / totalProducts) * 50);
    }
    if (phase === "analyzing") {
      return 50 + Math.round((currentStep / totalProducts) * 50);
    }
    if (phase === "done") return 100;
    return 0;
  }

  function getProgressLabel(): string {
    if (phase === "scraping") {
      return `Scraping produit ${currentStep}/${totalProducts}...`;
    }
    if (phase === "analyzing") {
      return `Analyse produit ${currentStep}/${totalProducts}...`;
    }
    return "";
  }

  async function handleAddAsins() {
    const asins = asinInput
      .split(/[\s,;]+/)
      .map((a) => a.trim())
      .filter(Boolean);
    if (asins.length === 0) return;

    setAdding(true);
    await fetch(`/api/guides/${guideId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asins }),
    });
    setAsinInput("");
    setAdding(false);
    onRefresh();
  }

  async function handleRemove(productId: string) {
    await fetch(`/api/guides/${guideId}/products`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    onRefresh();
  }

  async function handleLaunchScrape() {
    setScraping(true);
    setScrapeError(null);
    setPhase("scraping");
    setCurrentStep(0);
    setTotalProducts(products.length);

    const res = await fetch(`/api/guides/${guideId}/scrape`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setScrapeError(data.error || "Erreur démarrage");
      setScraping(false);
      setPhase("idle");
      return;
    }

    // Polling toutes les 3s
    pollRef.current = setInterval(async () => {
      const pollRes = await fetch(`/api/guides/${guideId}/scrape`);
      if (!pollRes.ok) return;
      const data = await pollRes.json();

      if (data.totalProducts) setTotalProducts(data.totalProducts);

      if (data.status === "scraping") {
        setPhase("scraping");
        setCurrentStep(data.currentStep || 0);
      } else if (data.status === "analyzing") {
        setPhase("analyzing");
        setCurrentStep(data.currentStep || 0);
      } else if (data.status === "products-ready") {
        setPhase("done");
        setScraping(false);
        stopPolling();
        setTimeout(() => setPhase("idle"), 1500);
        onRefresh();
      } else if (data.status === "error") {
        setScrapeError(data.errorMessage || "Erreur inconnue");
        setScraping(false);
        setPhase("idle");
        stopPolling();
        onRefresh();
      }
    }, 3000);
  }

  return (
    <div className="space-y-4 max-w-2xl pb-20">
      {/* Ajout ASIN */}
      <div className="space-y-2">
        <Textarea
          placeholder="ASIN(s) — un par ligne, ou séparés par espace / virgule"
          value={asinInput}
          onChange={(e) => setAsinInput(e.target.value)}
          disabled={adding || scraping}
          rows={3}
          className="resize-none"
        />
        <Button size="sm" onClick={handleAddAsins} disabled={adding || scraping || !asinInput.trim()}>
          {adding ? (
            <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Ajout...</>
          ) : (
            <><Plus className="mr-2 w-4 h-4" />Ajouter les produits</>
          )}
        </Button>
      </div>

      {/* Compteur produits */}
      <span className="text-sm text-muted-foreground">{products.length} produit{products.length !== 1 ? "s" : ""}</span>

      {products.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun produit — ajoutez des ASINs ci-dessus.
        </p>
      )}

      {products.map((product, index) => (
        <Card key={product.id}>
          <CardContent className="flex items-center gap-4 p-4">
            <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-16 h-16 object-cover rounded-md border"
              />
            ) : (
              <div className="w-16 h-16 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                {product.asin}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {product.title || product.asin}
              </p>
              {product.brand && (
                <p className="text-xs text-muted-foreground">
                  {product.brand} · {product.asin}
                </p>
              )}
              {!product.brand && (
                <p className="text-xs text-muted-foreground">{product.asin}</p>
              )}
              {product.price && (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs">{product.price}</span>
                  {product.reviewCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {product.reviewCount} avis
                    </span>
                  )}
                </div>
              )}
            </div>
            <StatusBadge status={product.status} />
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              disabled={scraping}
              onClick={() => setDeleteTarget(product)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Bouton sticky en bas */}
      {products.length > 0 && (
        <div className="sticky bottom-0 z-10 -mx-6 px-6 py-3 bg-background/95 backdrop-blur-sm border-t">
          {/* Barre de progression */}
          {scraping && (
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {getProgressLabel()}
                </span>
                <span className="text-muted-foreground">{getProgressPercent()}%</span>
              </div>
              <Progress value={getProgressPercent()} className="h-2" />
            </div>
          )}

          {scrapeError && (
            <p className="text-sm text-red-600 mb-2">{scrapeError}</p>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleLaunchScrape}
            disabled={scraping || products.every((p) => p.status === "done")}
          >
            {scraping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Récupération en cours...
              </>
            ) : products.every((p) => p.status === "done") ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Tous les produits sont récupérés
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Lancer la récupération
              </>
            )}
          </Button>
        </div>
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.title || deleteTarget?.asin} sera retiré de ce guide. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  handleRemove(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
