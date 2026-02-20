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
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle>ASIN : {product.asin}</CardTitle>
                <CardDescription>
                  Mot-cle : <span className="font-medium">{product.keyword}</span>
                  {" — "}
                  Media : {product.media.name}
                  {" — "}
                  Modele : {product.modelUsed}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {product.wordCount} mots
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Generee le{" "}
              {new Date(product.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </CardHeader>
        </Card>

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
      </main>
    </>
  );
}
