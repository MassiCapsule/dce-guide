import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Quote, Users, Wrench, Target } from "lucide-react";
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
import { formatCost } from "@/lib/pricing";

interface PageProps {
  params: Promise<{ id: string }>;
}

function parseJsonField(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function IntelligenceDetailPage({ params }: PageProps) {
  const { id } = await params;

  const product = await prisma.productIntelligence.findUnique({
    where: { id },
    include: {
      generatedCards: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, keyword: true, wordCount: true, createdAt: true },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const keyFeatures = parseJsonField(product.keyFeatures);
  const detectedUsages = parseJsonField(product.detectedUsages);
  const recurringProblems = parseJsonField(product.recurringProblems);
  const buyerProfiles = parseJsonField(product.buyerProfiles);
  const strengthPoints = parseJsonField(product.strengthPoints);
  const weaknessPoints = parseJsonField(product.weaknessPoints);
  const remarkableQuotes = parseJsonField(product.remarkableQuotes);

  const totalCost = product.scrapingCost + product.analysisCost;

  return (
    <>
      <Header title="Produit">
        <Button variant="outline" size="sm" asChild>
          <Link href="/intelligence">
            <ArrowLeft className="mr-2 h-3 w-3" />
            Retour
          </Link>
        </Button>
      </Header>

      <main className="p-6 space-y-6 max-w-5xl">
        {/* Infos produit */}
        <Card>
          <CardHeader>
            <div className="flex gap-4">
              {product.productImageUrl && (
                <div className="bg-white border rounded-lg p-2 flex-shrink-0">
                  <img
                    src={product.productImageUrl}
                    alt={product.productTitle}
                    className="w-24 h-24 object-contain"
                  />
                </div>
              )}
              <div className="space-y-1">
                <CardTitle>{product.productTitle || product.asin}</CardTitle>
                <CardDescription>
                  {product.productBrand && `${product.productBrand} — `}
                  ASIN : <span className="font-mono">{product.asin}</span>
                  {product.productPrice && ` — ${product.productPrice}`}
                </CardDescription>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {product.analyzed ? (
                    <Badge variant="default">Analyse terminee</Badge>
                  ) : (
                    <Badge variant="secondary">Non analyse</Badge>
                  )}
                  {product.reviewCount > 0 && (
                    <Badge variant="outline">{product.reviewCount} avis scrapes</Badge>
                  )}
                  {product.sentimentScore > 0 && (
                    <Badge variant="outline">
                      Sentiment : {Math.round(product.sentimentScore * 100)}%
                    </Badge>
                  )}
                  {totalCost > 0 && (
                    <Badge variant="outline" className="font-mono">
                      Cout : {formatCost(totalCost)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Positionnement */}
        {product.positioningSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" />
                Positionnement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{product.positioningSummary}</p>
            </CardContent>
          </Card>
        )}

        {/* Points forts / faibles en 2 colonnes */}
        {(strengthPoints.length > 0 || weaknessPoints.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {strengthPoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Points forts ({strengthPoints.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {strengthPoints.map((point, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-green-600 flex-shrink-0">+</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {weaknessPoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-red-700">
                    <XCircle className="w-4 h-4" />
                    Points faibles ({weaknessPoints.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {weaknessPoints.map((point, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-red-600 flex-shrink-0">-</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Caracteristiques cles + Usages */}
        {(keyFeatures.length > 0 || detectedUsages.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {keyFeatures.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Caracteristiques cles ({keyFeatures.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {keyFeatures.map((f, i) => (
                      <li key={i} className="text-sm">{f}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {detectedUsages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Usages detectes ({detectedUsages.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {detectedUsages.map((u, i) => (
                      <li key={i} className="text-sm">{u}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Profils acheteurs */}
        {buyerProfiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Profils acheteurs ({buyerProfiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {buyerProfiles.map((profile, i) => (
                  <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                    {profile}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Problemes recurrents */}
        {recurringProblems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
                Problemes recurrents ({recurringProblems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {recurringProblems.map((p, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-amber-600 flex-shrink-0">!</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Citations remarquables */}
        {remarkableQuotes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Quote className="w-4 h-4" />
                Citations remarquables ({remarkableQuotes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {remarkableQuotes.map((quote, i) => (
                  <blockquote
                    key={i}
                    className="text-sm italic border-l-2 border-muted-foreground/30 pl-3 text-muted-foreground"
                  >
                    &laquo; {quote} &raquo;
                  </blockquote>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fiches generees pour ce produit */}
        {product.generatedCards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Fiches generees ({product.generatedCards.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {product.generatedCards.map((card) => (
                  <Link
                    key={card.id}
                    href={`/produits/${card.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {card.keyword}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {card.wordCount} mots
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(card.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cout */}
        {totalCost > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {product.scrapingCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scraping Apify</span>
                    <span className="font-mono">{formatCost(product.scrapingCost)}</span>
                  </div>
                )}
                {product.analysisCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Analyse ({product.analysisModelUsed}) — {product.analysisPromptTokens.toLocaleString()} + {product.analysisCompletionTokens.toLocaleString()} tokens
                    </span>
                    <span className="font-mono">{formatCost(product.analysisCost)}</span>
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
