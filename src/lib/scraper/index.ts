import { prisma } from "@/lib/prisma";
import { scrapeAmazonProduct } from "./amazon-product";
import { scrapeAmazonReviews } from "./amazon-reviews";

const MARKETPLACE = "amazon.fr";

export async function scrapeAndStore(asin: string, forceRefresh = false) {
  // Check for existing record
  if (!forceRefresh) {
    const existing = await prisma.productIntelligence.findUnique({
      where: { asin_marketplace: { asin, marketplace: MARKETPLACE } },
    });

    if (existing) {
      return existing;
    }
  }

  // Scrape product data and reviews in parallel
  const [productData, reviews] = await Promise.all([
    scrapeAmazonProduct(asin),
    scrapeAmazonReviews(asin),
  ]);

  // Upsert the ProductIntelligence record
  const intelligence = await prisma.productIntelligence.upsert({
    where: { asin_marketplace: { asin, marketplace: MARKETPLACE } },
    create: {
      asin,
      marketplace: MARKETPLACE,
      productTitle: productData.title,
      productBrand: productData.brand,
      productPrice: productData.price,
      productImageUrl: productData.mainImageUrl,
      rawProductJson: JSON.stringify(productData),
      rawReviewsJson: JSON.stringify(reviews),
      reviewCount: reviews.length,
    },
    update: {
      productTitle: productData.title,
      productBrand: productData.brand,
      productPrice: productData.price,
      productImageUrl: productData.mainImageUrl,
      rawProductJson: JSON.stringify(productData),
      rawReviewsJson: JSON.stringify(reviews),
      reviewCount: reviews.length,
      analyzed: false,
      // Reset analysis fields on refresh
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
