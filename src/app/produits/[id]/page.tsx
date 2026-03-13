import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
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
import { ProductCardViewer } from "@/components/products/product-card-viewer";
import { DeleteProductButton } from "@/components/products/delete-product-button";
import { DownloadImageButton } from "@/components/products/download-image-button";
import { formatCost } from "@/lib/pricing";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProduitDetailPage({ params }: PageProps) {
  const { id } = await params;

  const product = await prisma.generatedProductCard.findUnique({
    where: { id },
    include: {
      media: true,
      intelligence: true,
    },
  });

  if (!product) {
    notFound();
  }

  const totalCost = product.generationCost + (product.intelligence.analysisCost || 0) + (product.intelligence.scrapingCost || 0);

  return (
    <>
      <Header title="Fiche produit">
        <Button variant="outline" size="sm" asChild>
          <Link href="/produits">
            <ArrowLeft className="mr-2 h-3 w-3" />
            Retour
          </Link>
        </Button>
        <DeleteProductButton productId={product.id} redirectTo="/produits" />
      </Header>

      <main className="p-6 space-y-6 max-w-4xl">
        {/* Infos produit */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle>{product.intelligence.productTitle || `ASIN : ${product.asin}`}</CardTitle>
                <CardDescription>
                  {product.intelligence.productBrand && `${product.intelligence.productBrand} — `}
                  Mot-cle : <span className="font-medium">{product.keyword}</span>
                  {" — "}
                  Media : {product.media.name}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary">{product.wordCount} mots</Badge>
              <Badge variant="outline">{product.media.name}</Badge>
              <Badge variant="outline">{product.modelUsed}</Badge>
              {totalCost > 0 && (
                <Badge variant="outline" className="font-mono">
                  {formatCost(totalCost)}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Generee le{" "}
                {new Date(product.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </CardHeader>
        </Card>

        {/* Contenu genere */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contenu genere</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductCardViewer
              html={product.contentHtml}
              wordCount={product.wordCount}
            />
          </CardContent>
        </Card>

        {/* Photo produit */}
        {product.intelligence.productImageUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Image produit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white border rounded-lg p-4">
                  <img
                    src={product.intelligence.productImageUrl}
                    alt={product.intelligence.productTitle}
                    className="max-h-80 object-contain"
                  />
                </div>
                <DownloadImageButton
                  imageUrl={product.intelligence.productImageUrl}
                  fileName={product.intelligence.productTitle || product.asin}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cout API */}
        {(product.promptTokens > 0 || product.intelligence.analysisPromptTokens > 0 || product.intelligence.scrapingCost > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cout API</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {product.intelligence.scrapingCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scraping Apify</span>
                    <span className="font-mono">{formatCost(product.intelligence.scrapingCost)}</span>
                  </div>
                )}
                {product.intelligence.analysisPromptTokens > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Analyse ({product.intelligence.analysisModelUsed}) — {product.intelligence.analysisPromptTokens.toLocaleString()} + {product.intelligence.analysisCompletionTokens.toLocaleString()} tokens
                    </span>
                    <span className="font-mono">{formatCost(product.intelligence.analysisCost)}</span>
                  </div>
                )}
                {product.promptTokens > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Generation ({product.modelUsed}) — {product.promptTokens.toLocaleString()} + {product.completionTokens.toLocaleString()} tokens
                    </span>
                    <span className="font-mono">{formatCost(product.generationCost)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>Total</span>
                  <span className="font-mono">{formatCost(totalCost)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </main>
    </>
  );
}
