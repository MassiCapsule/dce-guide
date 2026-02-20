import { apifyClient } from "@/lib/apify";

export interface AmazonProductData {
  title: string;
  brand: string;
  price: string;
  mainImageUrl: string;
  description: string;
  features: string[];
  asin: string;
  rating: number;
  reviewCount: number;
}

export async function scrapeAmazonProduct(asin: string): Promise<AmazonProductData> {
  const run = await apifyClient.actor("junglee/amazon-crawler").call({
    categoryOrProductUrls: [{ url: `https://www.amazon.fr/dp/${asin}` }],
    maxItemsPerStartUrl: 1,
    proxyCountry: "FR",
  });

  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
  const item = items[0] as any;
  if (!item) throw new Error(`Aucun produit trouve pour l'ASIN ${asin}`);

  return {
    title: item.title || "",
    brand: item.brand || "",
    price: item.price?.value ? `${item.price.value} ${item.price.currency || "EUR"}` : "",
    mainImageUrl: item.mainImage?.link || item.thumbnailImage || "",
    description: item.description || "",
    features: item.features || [],
    asin: item.asin || asin,
    rating: item.stars || 0,
    reviewCount: item.reviewsCount || 0,
  };
}
