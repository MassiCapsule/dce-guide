import { prisma } from "@/lib/prisma";
import { scrapeAmazonProduct } from "./amazon-product";
import { scrapeAmazonReviews } from "./amazon-reviews";

const MARKETPLACE = "amazon.fr";

export async function scrapeAndStore(asin: string, forceRefresh = false, maxAgeDays?: number) {
  // Check for existing record
  const existing = await prisma.productIntelligence.findUnique({
    where: { asin_marketplace: { asin, marketplace: MARKETPLACE } },
  });

  // A placeholder has no productTitle — always scrape it
  const isPlaceholder = existing && !existing.productTitle;

  if (existing && !forceRefresh && !isPlaceholder) {
    // If maxAgeDays is set, check freshness
    if (maxAgeDays !== undefined) {
      const ageMs = Date.now() - existing.createdAt.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays <= maxAgeDays) {
        return existing;
      }
      // Stale → continue to re-scrape
    } else {
      return existing;
    }
  }

  // Scrape product data and reviews in parallel
  const [productResult, reviewsResult] = await Promise.all([
    scrapeAmazonProduct(asin),
    scrapeAmazonReviews(asin),
  ]);

  const scrapingCost = productResult.costUsd + reviewsResult.costUsd;

  // Upsert the ProductIntelligence record
  const intelligence = await prisma.productIntelligence.upsert({
    where: { asin_marketplace: { asin, marketplace: MARKETPLACE } },
    create: {
      asin,
      marketplace: MARKETPLACE,
      productTitle: productResult.data.title,
      productBrand: productResult.data.brand,
      productPrice: productResult.data.price,
      productImageUrl: productResult.data.mainImageUrl,
      rawProductJson: JSON.stringify(productResult.rawItem),
      rawReviewsJson: JSON.stringify(reviewsResult.rawItems),
      reviewCount: reviewsResult.reviews.length,
      scrapingCost,
    },
    update: {
      productTitle: productResult.data.title,
      productBrand: productResult.data.brand,
      productPrice: productResult.data.price,
      productImageUrl: productResult.data.mainImageUrl,
      rawProductJson: JSON.stringify(productResult.rawItem),
      rawReviewsJson: JSON.stringify(reviewsResult.rawItems),
      reviewCount: reviewsResult.reviews.length,
      scrapingCost,
      analyzed: false,
      positioningSummary: "",
      keyFeatures: "[]",
      detectedUsages: "[]",
      recurringProblems: "[]",
      buyerProfiles: "[]",
      sentimentScore: 0,
      strengthPoints: "[]",
      weaknessPoints: "[]",
      remarkableQuotes: "[]",
    },
  });

  return intelligence;
}
