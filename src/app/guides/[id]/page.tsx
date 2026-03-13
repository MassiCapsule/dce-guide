"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabOverview } from "@/components/guides/tabs/tab-overview";
import { TabProducts } from "@/components/guides/tabs/tab-products";
import { TabPlan } from "@/components/guides/tabs/tab-plan";
import { TabArticle } from "@/components/guides/tabs/tab-article";

// --- Fixture data (UX development — no real API calls) ---
const guideFixture = {
  keyword: "meilleurs robots aspirateurs 2025",
  targetWordCount: 4200,
  selectionCriteria:
    "Choisir des produits avec plus de 100 avis, compatibles parquet et carrelage, autonomie supérieure à 90 minutes.",
  steps: {
    guide: { status: "done" as const, date: "2026-03-11" },
    products: { status: "done" as const, date: "2026-03-12" },
    plan: { status: "in_progress" as const, date: null },
    article: { status: "locked" as const, date: null },
  },
};

const productsFixture = [
  {
    id: "prod-1",
    asin: "B09X3P4QGM",
    title: "iRobot Roomba j7+",
    brand: "iRobot",
    price: "549,99 €",
    imageUrl: "https://placehold.co/200x200?text=Roomba+j7%2B",
    reviewCount: 2847,
    rating: 4.4,
    status: "done" as const,
  },
  {
    id: "prod-2",
    asin: "B0BW3TT41M",
    title: "Roborock S8 Pro Ultra",
    brand: "Roborock",
    price: "999,99 €",
    imageUrl: "https://placehold.co/200x200?text=Roborock+S8",
    reviewCount: 1243,
    rating: 4.6,
    status: "done" as const,
  },
  {
    id: "prod-3",
    asin: "B0C5MKL8VR",
    title: "Ecovacs Deebot X2 Omni",
    brand: "Ecovacs",
    price: "799,00 €",
    imageUrl: "https://placehold.co/200x200?text=Deebot+X2",
    reviewCount: 876,
    rating: 4.3,
    status: "pending" as const,
  },
];

const planHtml =
  "<h2>Introduction</h2><p><strong>Brief :</strong> Présenter le sujet, accrocher le lecteur avec les critères clés de choix.</p><p><strong>Mots-clés :</strong> robot aspirateur, meilleur 2025, guide d'achat</p><p><strong>Mots cible :</strong> 300 mots</p><h2>Critères de sélection</h2><p><strong>Brief :</strong> Expliquer sur quoi on juge les produits : autonomie, puissance, navigation.</p><p><strong>Mots-clés :</strong> autonomie, puissance aspiration, cartographie, navigation laser</p><p><strong>Mots cible :</strong> 400 mots</p><h2>Produit 1 — iRobot Roomba j7+</h2><p><strong>Brief :</strong> Présenter le Roomba j7+, ses points forts (évitement d'obstacles) et ses limites.</p><p><strong>Mots-clés :</strong> iRobot, évitement obstacles, vider automatiquement</p><p><strong>Mots cible :</strong> 600 mots</p><h2>Produit 2 — Roborock S8 Pro Ultra</h2><p><strong>Brief :</strong> Présenter le S8 Pro Ultra, le meilleur polyvalent du marché.</p><p><strong>Mots-clés :</strong> Roborock, lavage, station auto-nettoyante</p><p><strong>Mots cible :</strong> 600 mots</p><h2>Produit 3 — Ecovacs Deebot X2 Omni</h2><p><strong>Brief :</strong> Présenter le Deebot X2, design carré pour les coins.</p><p><strong>Mots-clés :</strong> Ecovacs, coins, aspiration et lavage combinés</p><p><strong>Mots cible :</strong> 600 mots</p><h2>FAQ</h2><p><strong>Brief :</strong> 5 questions fréquentes des acheteurs.</p><p><strong>Mots cible :</strong> 400 mots</p><h2>Sommaire</h2><p><strong>Brief :</strong> Liste des produits avec liens internes.</p><p><strong>Mots cible :</strong> 100 mots</p>";

const articleHtml =
  "<h1>Meilleurs robots aspirateurs 2025 — Comparatif &amp; Avis</h1><p>Choisir le meilleur robot aspirateur en 2025 nécessite de comparer l'autonomie, la puissance d'aspiration et les fonctionnalités avancées comme la navigation laser.</p><h2>1. iRobot Roomba j7+</h2><p>Le Roomba j7+ est le champion de l'évitement d'obstacles. Grâce à sa technologie PrecisionVision, il reconnaît et évite les câbles, chaussures et autres obstacles du quotidien.</p><ul><li>Puissance d'aspiration : 10x supérieure aux modèles standards</li><li>Autonomie : 75 minutes</li><li>Station automatique de vidage incluse</li></ul><h2>2. Roborock S8 Pro Ultra</h2><p>Le Roborock S8 Pro Ultra représente le summum de la polyvalence avec son module combiné aspiration et lavage. Sa station auto-nettoyante est la plus complète du marché.</p><ul><li>Double brosse en caoutchouc pour aspiration optimale</li><li>Système VibraRise pour le lavage</li><li>Navigation laser LiDAR de précision</li></ul><h2>3. Ecovacs Deebot X2 Omni</h2><p>Le Deebot X2 se distingue par sa forme carrée unique qui lui permet d'atteindre les coins des pièces, là où les robots ronds échouent systématiquement.</p><ul><li>Design carré pour les coins difficiles</li><li>Aspiration et lavage combinés</li><li>Navigation TrueMapping avancée</li></ul><h2>FAQ</h2><h3>Quel robot aspirateur choisir pour un appartement ?</h3><p>Pour un appartement, le Roomba j7+ est idéal grâce à sa compacité et son excellent évitement d'obstacles.</p><h3>Les robots aspirateurs fonctionnent-ils sur moquette ?</h3><p>Oui, tous nos modèles sélectionnés sont compatibles moquette avec détection automatique de surface.</p><h2>Sommaire</h2><ol><li><a href='#roomba'>iRobot Roomba j7+</a></li><li><a href='#roborock'>Roborock S8 Pro Ultra</a></li><li><a href='#deebot'>Ecovacs Deebot X2 Omni</a></li></ol>";

const planSeoKeywords = [
  { expression: "robot aspirateur", target: 8, current: 6, ok: false },
  { expression: "meilleur 2025", target: 4, current: 4, ok: true },
  { expression: "autonomie", target: 5, current: 2, ok: false },
  { expression: "navigation laser", target: 3, current: 0, ok: false },
  { expression: "puissance aspiration", target: 3, current: 3, ok: true },
  { expression: "station automatique", target: 2, current: 1, ok: false },
];

const metaFixture = {
  slug: "meilleurs-robots-aspirateurs-2025",
  metaTitle: "Meilleurs robots aspirateurs 2025 — Comparatif & Avis",
  metaDescription:
    "Découvrez notre sélection des 5 meilleurs robots aspirateurs 2025. Comparatif complet, avis et guide d'achat pour choisir le modèle idéal.",
  imageCaption: "Robot aspirateur iRobot Roomba j7+ sur parquet",
};
// ---------------------------------------------------------

export default function GuideDetailPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
      <Header title="Meilleurs robots aspirateurs 2025">
        <Button variant="outline" size="sm" asChild>
          <Link href="/guides">
            <ArrowLeft className="mr-2 h-3 w-3" />
            Retour
          </Link>
        </Button>
        <Button variant="destructive" size="sm" disabled>
          <Trash2 className="mr-2 h-3 w-3" />
          Supprimer
        </Button>
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
            <TabOverview data={guideFixture} onTabChange={setActiveTab} />
          </TabsContent>

          <TabsContent value="products">
            <TabProducts products={productsFixture} />
          </TabsContent>

          <TabsContent value="plan">
            <TabPlan
              initialHtml={planHtml}
              seoScore={72}
              seoKeywords={planSeoKeywords}
              meta={metaFixture}
            />
          </TabsContent>

          <TabsContent value="article">
            <TabArticle
              initialHtml={articleHtml}
              seoScore={null}
              seoKeywords={[]}
              meta={metaFixture}
            />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
