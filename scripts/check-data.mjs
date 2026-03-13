import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Lister tous les produits
const all = await p.productIntelligence.findMany({
  select: { id: true, asin: true, productTitle: true, reviewCount: true, rawProductJson: true, rawReviewsJson: true }
});

for (const prod of all) {
  console.log(`\n=== ${prod.asin} (${prod.id}) ===`);
  console.log('Title:', JSON.stringify(prod.productTitle));
  console.log('ReviewCount:', prod.reviewCount);

  // Show raw product keys
  try {
    const rawProd = JSON.parse(prod.rawProductJson || '{}');
    console.log('rawProduct keys:', Object.keys(rawProd));
    if (rawProd.title) console.log('  rawProduct.title:', rawProd.title.slice(0, 80));
  } catch { console.log('rawProduct: parse error'); }

  // Show first raw review
  try {
    const rawReviews = JSON.parse(prod.rawReviewsJson || '[]');
    console.log('rawReviews count:', rawReviews.length);
    if (rawReviews.length > 0) {
      console.log('First review keys:', Object.keys(rawReviews[0]));
      console.log('First review sample:', JSON.stringify(rawReviews[0]).slice(0, 500));
    }
  } catch { console.log('rawReviews: parse error'); }
}

await p.$disconnect();
