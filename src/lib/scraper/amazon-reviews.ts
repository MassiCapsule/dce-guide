import { apifyClient } from "@/lib/apify";

export interface AmazonReview {
  title: string;
  text: string;
  rating: number;
  date: string;
  verified: boolean;
  author: string;
}

export interface ScrapeReviewsResult {
  reviews: AmazonReview[];
  rawItems: Record<string, unknown>[];
  costUsd: number;
}

/** Convertit des items bruts Apify (junglee/amazon-reviews-scraper) en AmazonReview[]. */
export function mapRawReviews(items: any[]): AmazonReview[] {
  return items
    .map((r) => ({
      title: r.reviewTitle || r.title || "",
      text: r.reviewDescription || r.text || r.reviewBody || "",
      rating: r.ratingScore || r.rating || r.stars || 0,
      date: r.date || r.reviewDate || "",
      verified: r.isVerified ?? r.verifiedPurchase ?? false,
      author: r.userId || r.authorName || r.author || "",
    }))
    .filter((r) => r.text.length > 10);
}

export async function scrapeAmazonReviews(asin: string, maxReviews = 100): Promise<ScrapeReviewsResult> {
  const run = await apifyClient.actor("junglee/amazon-reviews-scraper").call({
    productUrls: [{ url: `https://www.amazon.fr/dp/${asin}` }],
    maxReviews,
    filterByRatings: ["fiveStar", "fourStar"],
    sort: "helpful",
    proxyCountry: "AUTO_SELECT_PROXY_COUNTRY",
  });

  const costUsd = (run as any).usageTotalUsd || 0;

  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

  // Debug: log first review item keys and sample
  if (items.length > 0) {
    console.log(`[SCRAPER REVIEWS] ASIN=${asin} — ${items.length} items — Raw keys:`, Object.keys(items[0]));
    console.log(`[SCRAPER REVIEWS] ASIN=${asin} — Sample:`, JSON.stringify(items[0], null, 2).slice(0, 2000));
  } else {
    console.log(`[SCRAPER REVIEWS] ASIN=${asin} — 0 items returned`);
  }

  const reviews = mapRawReviews(items as any[]);

  return { reviews, rawItems: items as Record<string, unknown>[], costUsd };
}
