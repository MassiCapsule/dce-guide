/**
 * Script de test : scrape 3 avis et 1 produit pour voir les vrais noms de champs Apify.
 * Usage: node scripts/test-apify-fields.mjs
 */
import { ApifyClient } from 'apify-client';
import 'dotenv/config';

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
const ASIN = 'B0DYDZ2TMW'; // Un ASIN connu

console.log('=== TEST APIFY FIELD NAMES ===\n');

// 1. Scrape produit
console.log('--- SCRAPING PRODUCT ---');
try {
  const prodRun = await client.actor('junglee/amazon-crawler').call({
    categoryOrProductUrls: [{ url: `https://www.amazon.fr/dp/${ASIN}` }],
    maxItemsPerStartUrl: 1,
    proxyCountry: 'FR',
  });
  console.log('Product run cost:', (prodRun).usageTotalUsd, 'USD');
  const { items: prodItems } = await client.dataset(prodRun.defaultDatasetId).listItems();
  if (prodItems.length > 0) {
    console.log('\nProduct item KEYS:', Object.keys(prodItems[0]));
    console.log('\nProduct item FULL JSON (first 5000 chars):');
    console.log(JSON.stringify(prodItems[0], null, 2).slice(0, 5000));
  } else {
    console.log('No product items returned!');
  }
} catch (e) {
  console.error('Product scrape error:', e.message);
}

console.log('\n\n--- SCRAPING REVIEWS ---');
try {
  const revRun = await client.actor('junglee/amazon-reviews-scraper').call({
    productUrls: [{ url: `https://www.amazon.fr/dp/${ASIN}` }],
    maxReviews: 3,
    proxyCountry: 'AUTO_SELECT_PROXY_COUNTRY',
  });
  console.log('Reviews run cost:', (revRun).usageTotalUsd, 'USD');
  const { items: revItems } = await client.dataset(revRun.defaultDatasetId).listItems();
  console.log(`\n${revItems.length} reviews returned`);
  if (revItems.length > 0) {
    console.log('\nReview item KEYS:', Object.keys(revItems[0]));
    console.log('\nFirst review FULL JSON:');
    console.log(JSON.stringify(revItems[0], null, 2));
    if (revItems.length > 1) {
      console.log('\nSecond review FULL JSON:');
      console.log(JSON.stringify(revItems[1], null, 2));
    }
  } else {
    console.log('No review items returned!');
  }
} catch (e) {
  console.error('Reviews scrape error:', e.message);
}

console.log('\n=== DONE ===');
