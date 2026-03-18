"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
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
import { formatCost } from "@/lib/pricing";

interface ProductItem {
  id: string;
  asin: string;
  productTitle: string;
  productBrand: string;
  productPrice: string;
  productImageUrl: string;
  reviewCount: number;
  analyzed: boolean;
  scrapingCost: number;
  analysisCost: number;
  positioningSummary: string;
  _count: { generatedCards: number };
}

export function IntelligenceList({ products }: { products: ProductItem[] }) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/intelligence/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id} className="h-full group relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive z-10"
              onClick={(e) => {
                e.preventDefault();
                setDeleteTarget(product);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Link href={`/intelligence/${product.id}`} className="block">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {product.productImageUrl ? (
                    <img
                      src={product.productImageUrl}
                      alt={product.productTitle}
                      className="w-16 h-16 object-contain rounded border bg-white flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded border bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-xs">
                      ?
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold line-clamp-2 leading-tight">
                      {product.productTitle || product.asin}
                    </h2>
                    {product.productBrand && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {product.productBrand}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {product.analyzed ? (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          Analyse
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Non analyse
                        </Badge>
                      )}
                      {product.reviewCount > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {product.reviewCount} avis
                        </Badge>
                      )}
                      {product._count.generatedCards > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {product._count.generatedCards} fiche{product._count.generatedCards > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {product.productPrice && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                          {product.productPrice}
                        </Badge>
                      )}
                      {(product.scrapingCost + product.analysisCost) > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                          {formatCost(product.scrapingCost + product.analysisCost)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {product.positioningSummary && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-3">
                    {product.positioningSummary}
                  </p>
                )}
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.productTitle || deleteTarget?.asin}</strong> sera supprimé avec toutes ses fiches générées et ses liaisons aux guides. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
