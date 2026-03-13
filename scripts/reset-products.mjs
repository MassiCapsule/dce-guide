/**
 * Supprime tous les ProductIntelligence de la BDD pour forcer un re-scrape propre.
 * Usage: node scripts/reset-products.mjs
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// D'abord supprimer les GuideProducts (FK vers ProductIntelligence)
const delGP = await p.guideProduct.deleteMany({});
console.log(`Deleted ${delGP.count} GuideProduct(s)`);

// Supprimer les GeneratedProductCards (FK vers ProductIntelligence)
const delCards = await p.generatedProductCard.deleteMany({});
console.log(`Deleted ${delCards.count} GeneratedProductCard(s)`);

// Supprimer tous les ProductIntelligence
const delPI = await p.productIntelligence.deleteMany({});
console.log(`Deleted ${delPI.count} ProductIntelligence(s)`);

// Supprimer les guides (pour repartir propre)
const delGK = await p.guideKeyword.deleteMany({});
console.log(`Deleted ${delGK.count} GuideKeyword(s)`);
const delG = await p.guide.deleteMany({});
console.log(`Deleted ${delG.count} Guide(s)`);

console.log('\nDone! Tous les produits et guides ont ete supprimes. Recreez un guide pour re-scraper.');
await p.$disconnect();
