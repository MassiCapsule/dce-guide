import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { formatCost } from "@/lib/pricing";

export default async function ProduitsPage() {
  const products = await prisma.generatedProductCard.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      media: true,
      intelligence: true,
    },
  });

  return (
    <>
      <Header title="Fiches generees" />

      <main className="p-6">
        {products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                Aucune fiche produit generee pour le moment.
              </p>
              <Button asChild>
                <Link href="/guides/nouveau">Creer un guide</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const preview = product.contentHtml
                .replace(/<[^>]*>/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 120);

              return (
                <Link key={product.id} href={`/produits/${product.id}`} className="block group">
                  <Card className="h-full transition-shadow group-hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {product.intelligence.productImageUrl ? (
                          <img
                            src={product.intelligence.productImageUrl}
                            alt={product.intelligence.productTitle}
                            className="w-16 h-16 object-contain rounded border bg-white flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded border bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-xs">
                            ?
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h2 className="text-sm font-semibold line-clamp-2 leading-tight">
                            {product.intelligence.productTitle || product.asin}
                          </h2>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {product.wordCount} mots
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {product.media.name}
                            </Badge>
                            {product.generationCost > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                                {formatCost(product.generationCost)}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(product.createdAt).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-3">
                        {preview}...
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
