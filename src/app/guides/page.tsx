import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCost } from "@/lib/pricing";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "secondary" },
  scraping: { label: "Scraping...", variant: "outline" },
  analyzing: { label: "Analyse...", variant: "outline" },
  distributing: { label: "Distribution...", variant: "outline" },
  generating: { label: "Generation...", variant: "outline" },
  "generating-guide": { label: "Guide...", variant: "outline" },
  complete: { label: "Termine", variant: "default" },
  error: { label: "Erreur", variant: "destructive" },
};

export default async function GuidesPage() {
  const guides = await prisma.guide.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      media: { select: { name: true } },
      _count: { select: { products: true } },
    },
  });

  return (
    <>
      <Header title="Guides d'achat">
        <Button size="sm" asChild>
          <Link href="/guides/nouveau">
            <Plus className="mr-2 h-3 w-3" />
            Nouveau guide
          </Link>
        </Button>
      </Header>

      <main className="p-6">
        {guides.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                Aucun guide pour le moment.
              </p>
              <Button asChild>
                <Link href="/guides/nouveau">Creer un guide</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => {
              const statusInfo = STATUS_LABELS[guide.status] || STATUS_LABELS.draft;

              return (
                <Link
                  key={guide.id}
                  href={`/guides/${guide.id}`}
                  className="block group"
                >
                  <Card className="h-full transition-shadow group-hover:shadow-md">
                    <CardContent className="p-4">
                      <h2 className="text-sm font-semibold line-clamp-2 leading-tight">
                        {guide.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        <Badge variant={statusInfo.variant} className="text-[10px] px-1.5 py-0">
                          {statusInfo.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {guide._count.products} produit{guide._count.products > 1 ? "s" : ""}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {guide.media.name}
                        </Badge>
                        {guide.totalCost > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                            {formatCost(guide.totalCost)}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(guide.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
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
