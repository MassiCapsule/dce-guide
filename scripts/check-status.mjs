import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Check guides
const guides = await p.guide.findMany({ include: { products: { include: { intelligence: true } }, keywords: true } });
for (const g of guides) {
  console.log(`\n=== GUIDE: ${g.title} ===`);
  console.log(`Status: ${g.status} | Error: ${g.errorMessage || '(none)'} | Step: ${g.currentStep}`);
  console.log(`Products: ${g.products.length} | Keywords: ${g.keywords.length}`);

  for (const gp of g.products) {
    const intel = gp.intelligence;
    console.log(`\n  Product #${gp.position}: ${intel.productTitle || '(no title)'} (${intel.asin})`);
    console.log(`    Analyzed: ${intel.analyzed} | Reviews: ${intel.reviewCount}`);
    console.log(`    Positioning: ${intel.positioningSummary ? intel.positioningSummary.slice(0, 100) + '...' : '(empty)'}`);
    console.log(`    Strengths: ${intel.strengthPoints}`);
    console.log(`    rawProductJson keys:`, Object.keys(JSON.parse(intel.rawProductJson || '{}')));
    const rawRevs = JSON.parse(intel.rawReviewsJson || '[]');
    console.log(`    rawReviewsJson: ${rawRevs.length} items`);
    if (rawRevs.length > 0) {
      console.log(`    First raw review keys:`, Object.keys(rawRevs[0]));
      console.log(`    First raw review title:`, rawRevs[0].reviewTitle || rawRevs[0].title || '(no title field)');
      console.log(`    First raw review text:`, (rawRevs[0].reviewDescription || rawRevs[0].text || '(no text)').slice(0, 100));
    }
    console.log(`    GeneratedCard: ${gp.generatedCardId || '(none)'}`);
  }
}

await p.$disconnect();
