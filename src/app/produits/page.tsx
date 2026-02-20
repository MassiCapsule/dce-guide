import Link from "next/link";
import { Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteProductButton } from "@/components/products/delete-product-button";

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
                <Link href="/generer">Generer une fiche</Link>
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
                .slice(0, 150);

              return (
                <Card key={product.id}>
                  <CardHeader className="space-y-1">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        {product.asin}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary">
                          {product.wordCount} mots
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      <span className="font-medium">{product.keyword}</span>
                      {" — "}
                      {product.media.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {preview}...
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {new Date(product.createdAt).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/produits/${product.id}`}>
                            <Eye className="mr-2 h-3 w-3" />
                            Voir
                          </Link>
                        </Button>
                        <DeleteProductButton productId={product.id} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
