import { apifyClient } from "@/lib/apify";

export interface AmazonReview {
  title: string;
  text: string;
  rating: number;
  date: string;
  verified: boolean;
  author: string;
}

export async function scrapeAmazonReviews(asin: string, maxReviews = 100): Promise<AmazonReview[]> {
  const run = await apifyClient.actor("junglee/amazon-reviews-scraper").call({
    productUrls: [{ url: `https://www.amazon.fr/dp/${asin}` }],
    maxReviews,
    proxyCountry: "AUTO_SELECT_PROXY_COUNTRY",
  });

  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

  return (items as any[]).map((r) => ({
    title: r.title || "",
    text: r.text || r.reviewBody || "",
    rating: r.rating || r.stars || 0,
    date: r.date || "",
    verified: r.isVerified || false,
    author: r.authorName || r.author || "",
  }));
}
