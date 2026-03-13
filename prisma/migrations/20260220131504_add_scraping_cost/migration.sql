-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductIntelligence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asin" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL DEFAULT 'amazon.fr',
    "productTitle" TEXT NOT NULL DEFAULT '',
    "productBrand" TEXT NOT NULL DEFAULT '',
    "productPrice" TEXT NOT NULL DEFAULT '',
    "productImageUrl" TEXT NOT NULL DEFAULT '',
    "positioningSummary" TEXT NOT NULL DEFAULT '',
    "keyFeatures" TEXT NOT NULL DEFAULT '[]',
    "detectedUsages" TEXT NOT NULL DEFAULT '[]',
    "recurringProblems" TEXT NOT NULL DEFAULT '[]',
    "buyerProfiles" TEXT NOT NULL DEFAULT '[]',
    "sentimentScore" REAL NOT NULL DEFAULT 0,
    "strengthPoints" TEXT NOT NULL DEFAULT '[]',
    "weaknessPoints" TEXT NOT NULL DEFAULT '[]',
    "remarkableQuotes" TEXT NOT NULL DEFAULT '[]',
    "rawProductJson" TEXT NOT NULL DEFAULT '{}',
    "rawReviewsJson" TEXT NOT NULL DEFAULT '[]',
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "analyzed" BOOLEAN NOT NULL DEFAULT false,
    "analysisPromptTokens" INTEGER NOT NULL DEFAULT 0,
    "analysisCompletionTokens" INTEGER NOT NULL DEFAULT 0,
    "analysisModelUsed" TEXT NOT NULL DEFAULT 'gpt-4o',
    "analysisCost" REAL NOT NULL DEFAULT 0,
    "scrapingCost" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ProductIntelligence" ("analysisCompletionTokens", "analysisCost", "analysisModelUsed", "analysisPromptTokens", "analyzed", "asin", "buyerProfiles", "createdAt", "detectedUsages", "id", "keyFeatures", "marketplace", "positioningSummary", "productBrand", "productImageUrl", "productPrice", "productTitle", "rawProductJson", "rawReviewsJson", "recurringProblems", "remarkableQuotes", "reviewCount", "sentimentScore", "strengthPoints", "weaknessPoints") SELECT "analysisCompletionTokens", "analysisCost", "analysisModelUsed", "analysisPromptTokens", "analyzed", "asin", "buyerProfiles", "createdAt", "detectedUsages", "id", "keyFeatures", "marketplace", "positioningSummary", "productBrand", "productImageUrl", "productPrice", "productTitle", "rawProductJson", "rawReviewsJson", "recurringProblems", "remarkableQuotes", "reviewCount", "sentimentScore", "strengthPoints", "weaknessPoints" FROM "ProductIntelligence";
DROP TABLE "ProductIntelligence";
ALTER TABLE "new_ProductIntelligence" RENAME TO "ProductIntelligence";
CREATE UNIQUE INDEX "ProductIntelligence_asin_marketplace_key" ON "ProductIntelligence"("asin", "marketplace");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
