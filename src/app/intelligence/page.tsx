import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCost } from "@/lib/pricing";

export default async function IntelligencePage() {
  const products = await prisma.productIntelligence.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { generatedCards: true } },
    },
  });

  return (
    <>
      <Header title="Produits" />

      <main className="p-6">
        {products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                Aucun produit scrape pour le moment. Generez une fiche pour scraper un produit.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/intelligence/${product.id}`}
                className="block group"
              >
                <Card className="h-full transition-shadow group-hover:shadow-md">
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
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
