import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { IntelligenceList } from "@/components/intelligence/intelligence-list";

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
          <IntelligenceList products={products} />
        )}
      </main>
    </>
  );
}
