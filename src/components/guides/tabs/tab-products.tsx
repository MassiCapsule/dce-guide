"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
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
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  async function handleAddAsin() {
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
    setScrapeStatus("Démarrage…");

    const res = await fetch(`/api/guides/${guideId}/scrape`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setScrapeError(data.error || "Erreur démarrage");
      setScraping(false);
      return;
    }

    // Polling toutes les 3s
    pollRef.current = setInterval(async () => {
      const pollRes = await fetch(`/api/guides/${guideId}/scrape`);
      if (!pollRes.ok) return;
      const data = await pollRes.json();

      if (data.status === "scraping") {
        setScrapeStatus(`Scraping produit ${data.currentStep}…`);
      } else if (data.status === "analyzing") {
        setScrapeStatus(`Analyse produit ${data.currentStep}…`);
      } else if (data.status === "products-ready") {
        setScrapeStatus("Terminé ✓");
        setScraping(false);
        stopPolling();
        onRefresh();
      } else if (data.status === "error") {
        setScrapeError(data.errorMessage || "Erreur inconnue");
        setScraping(false);
        stopPolling();
        onRefresh();
      }
    }, 3000);
  }

  const isPolling = SCRAPING_STATUSES.includes(scrapeStatus ?? "");

  return (
    <div className="space-y-4 max-w-2xl">
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
        <div className="flex gap-2">
          <Button size="sm" onClick={handleAddAsin} disabled={adding || scraping || !asinInput.trim()}>
            {adding ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Plus className="mr-2 w-4 h-4" />}
            Ajouter les produits
          </Button>
          <Button size="sm" onClick={handleLaunchScrape} disabled={scraping || products.length === 0}>
            {scraping ? (
              <>
                <Loader2 className="mr-2 w-3 h-3 animate-spin" />
                En cours…
              </>
            ) : (
              "Lancer la récupération"
            )}
          </Button>
          {scraping && scrapeStatus && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {scrapeStatus}
            </span>
          )}
          {!scraping && scrapeStatus && !scrapeError && (
            <span className="text-xs text-green-600 flex items-center">{scrapeStatus}</span>
          )}
          {scrapeError && (
            <span className="text-xs text-red-600 flex items-center">{scrapeError}</span>
          )}
        </div>
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
