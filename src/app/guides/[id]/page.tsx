"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TabOverview } from "@/components/guides/tabs/tab-overview";
import { TabProducts } from "@/components/guides/tabs/tab-products";
import { TabPlan } from "@/components/guides/tabs/tab-plan";
import { TabArticle } from "@/components/guides/tabs/tab-article";

interface GuideProduct {
  id: string;
  position: number;
  intelligence: {
    asin: string;
    productTitle: string;
    productBrand: string;
    productPrice: string;
    productImageUrl: string;
    reviewCount: number;
    analyzed: boolean;
  } | null;
}

interface Guide {
  id: string;
  title: string;
  criteria: string;
  status: string;
  wordCountMin: number;
  wordCountMax: number;
  serpanticsGuideId: string;
  planHtml: string;
  guideHtml: string;
  createdAt: string;
  updatedAt: string;
  products: GuideProduct[];
  keywords: { keyword: string; minOccurrences: number; maxOccurrences: number }[];
}

function computeSteps(guide: Guide) {
  const guideStep = {
    status: "done" as const,
    date: new Date(guide.createdAt).toLocaleDateString("fr-FR"),
  };

  const allAnalyzed =
    guide.products.length > 0 && guide.products.every((p) => p.intelligence?.analyzed);
  const productsStep = {
    status:
      guide.products.length === 0
        ? ("locked" as const)
        : allAnalyzed
        ? ("done" as const)
        : ("in_progress" as const),
    date: allAnalyzed ? new Date(guide.updatedAt).toLocaleDateString("fr-FR") : null,
  };

  const planStep = {
    status:
      productsStep.status !== "done"
        ? ("locked" as const)
        : guide.planHtml
        ? ("done" as const)
        : ("locked" as const),
    date: guide.planHtml ? new Date(guide.updatedAt).toLocaleDateString("fr-FR") : null,
  };

  const articleStep = {
    status:
      planStep.status !== "done"
        ? ("locked" as const)
        : guide.guideHtml
        ? ("done" as const)
        : ("locked" as const),
    date: guide.guideHtml ? new Date(guide.updatedAt).toLocaleDateString("fr-FR") : null,
  };

  return { guide: guideStep, products: productsStep, plan: planStep, article: articleStep };
}

function mapProducts(products: GuideProduct[]) {
  return products.map((p) => ({
    id: p.id,
    asin: p.intelligence?.asin ?? "",
    title: p.intelligence?.productTitle ?? "Produit inconnu",
    brand: p.intelligence?.productBrand ?? "",
    price: p.intelligence?.productPrice ?? "",
    imageUrl: p.intelligence?.productImageUrl ?? "",
    reviewCount: p.intelligence?.reviewCount ?? 0,
    rating: 0,
    status: (p.intelligence?.analyzed ? "done" : "pending") as "done" | "pending" | "error",
  }));
}

export default function GuideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [guide, setGuide] = useState<Guide | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [deleting, setDeleting] = useState(false);

  async function loadGuide() {
    const res = await fetch(`/api/guides/${id}`);
    if (res.ok) setGuide(await res.json());
  }

  useEffect(() => {
    loadGuide();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!guide) {
    return (
      <>
        <Header title="Chargement…" />
        <main className="p-6">
          <p className="text-muted-foreground text-sm">Chargement du guide…</p>
        </main>
      </>
    );
  }

  const overviewData = {
    keyword: guide.title,
    wordCountMin: guide.wordCountMin,
    wordCountMax: guide.wordCountMax,
    selectionCriteria: guide.criteria,
    keywords: guide.keywords
      .map((k) => ({
        keyword: k.keyword,
        min: k.minOccurrences,
        max: k.maxOccurrences,
      }))
      .sort((a, b) => b.max - a.max),
    steps: computeSteps(guide),
  };

  async function handleSaveCriteria(criteria: string) {
    await fetch(`/api/guides/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteria }),
    });
    setGuide((prev) => (prev ? { ...prev, criteria } : prev));
  }

  return (
    <>
      <Header title={guide.title}>
        <Button variant="outline" size="sm" asChild>
          <Link href="/guides">
            <ArrowLeft className="mr-2 h-3 w-3" />
            Retour
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={deleting}>
              <Trash2 className="mr-2 h-3 w-3" />
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce guide ?</AlertDialogTitle>
              <AlertDialogDescription>
                Le guide &laquo; {guide.title} &raquo; sera supprimé avec tous ses produits et mots-clés associés. Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  setDeleting(true);
                  await fetch(`/api/guides/${id}`, { method: "DELETE" });
                  router.push("/guides");
                }}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Header>

      <main className="p-6 max-w-5xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="article">Article</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <TabOverview
              data={overviewData}
              onTabChange={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="products">
            <TabProducts
              guideId={id}
              products={mapProducts(guide.products)}
              onRefresh={loadGuide}
            />
          </TabsContent>

          <TabsContent value="plan">
            <TabPlan
              guideId={id}
              initialHtml={guide.planHtml}
              initialCriteria={guide.criteria}
              keyword={guide.title}
              seoScore={null}
              seoKeywords={[]}
              serpanticsUrl={guide.serpanticsGuideId ? `https://app.serpmantics.com/${guide.serpanticsGuideId}/edit` : undefined}
              onRefresh={loadGuide}
              onSaveCriteria={handleSaveCriteria}
              onTabChange={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="article">
            <TabArticle
              guideId={id}
              initialHtml={guide.guideHtml}
              seoScore={null}
              seoKeywords={[]}
              serpanticsUrl={guide.serpanticsGuideId ? `https://app.serpmantics.com/${guide.serpanticsGuideId}/edit` : undefined}
              meta={{ slug: "", metaTitle: "", metaDescription: "", imageCaption: "" }}
              onRefresh={loadGuide}
            />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
