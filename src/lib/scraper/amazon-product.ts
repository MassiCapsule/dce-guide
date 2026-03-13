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

export interface ScrapeProductResult {
  data: AmazonProductData;
  rawItem: Record<string, unknown>;
  costUsd: number;
}

/**
 * Transforme une URL image Amazon en version haute definition.
 * Retire les suffixes de redimensionnement (_AC_SL1500_, _SX679_, etc.)
 * pour obtenir l'image originale pleine resolution.
 */
export function getHdImageUrl(url: string): string {
  if (!url) return "";
  return url.replace(/\._[^.]+_\./, ".");
}

/** Convertit un item brut Apify (junglee/amazon-crawler) en AmazonProductData. */
export function mapRawProduct(item: any): AmazonProductData {
  const rawImageUrl = item.highResolutionImages?.[0] || item.thumbnailImage || "";
  const priceVal = item.price?.value;
  const priceCurrency = item.price?.currency || "EUR";
  return {
    title: item.title || "",
    brand: item.brand || "",
    price: priceVal ? `${priceVal} ${priceCurrency}` : "",
    mainImageUrl: getHdImageUrl(rawImageUrl),
    description: item.description || "",
    features: item.features || [],
    asin: item.asin || "",
    rating: item.stars || 0,
    reviewCount: item.reviewsCount || 0,
  };
}

export async function scrapeAmazonProduct(asin: string): Promise<ScrapeProductResult> {
  const run = await apifyClient.actor("junglee/amazon-crawler").call({
    categoryOrProductUrls: [{ url: `https://www.amazon.fr/dp/${asin}` }],
    maxItemsPerStartUrl: 1,
    proxyCountry: "FR",
  });

  const costUsd = (run as any).usageTotalUsd || 0;

  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
  const item = items[0] as any;
  if (!item) throw new Error(`Aucun produit trouve pour l'ASIN ${asin}`);

  console.log(`[SCRAPER PRODUCT] ASIN=${asin} — Raw keys:`, Object.keys(item));

  const data = mapRawProduct(item);
  if (!data.title) {
    throw new Error(`Produit introuvable sur Amazon.fr pour l'ASIN ${asin} (le scraper n'a retourne aucune donnee)`);
  }
  data.asin = data.asin || asin;

  return { data, rawItem: item, costUsd };
}
