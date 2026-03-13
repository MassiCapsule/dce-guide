-- CreateTable
CREATE TABLE "AppConfig" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GeneratedProductCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asin" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "promptUsed" TEXT NOT NULL,
    "modelUsed" TEXT NOT NULL DEFAULT 'gpt-4o',
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "generationCost" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mediaId" TEXT NOT NULL,
    "intelligenceId" TEXT NOT NULL,
    CONSTRAINT "GeneratedProductCard_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GeneratedProductCard_intelligenceId_fkey" FOREIGN KEY ("intelligenceId") REFERENCES "ProductIntelligence" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GeneratedProductCard" ("asin", "contentHtml", "createdAt", "id", "intelligenceId", "keyword", "mediaId", "modelUsed", "promptUsed", "tokensUsed", "wordCount") SELECT "asin", "contentHtml", "createdAt", "id", "intelligenceId", "keyword", "mediaId", "modelUsed", "promptUsed", "tokensUsed", "wordCount" FROM "GeneratedProductCard";
DROP TABLE "GeneratedProductCard";
ALTER TABLE "new_GeneratedProductCard" RENAME TO "GeneratedProductCard";
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ProductIntelligence" ("analyzed", "asin", "buyerProfiles", "createdAt", "detectedUsages", "id", "keyFeatures", "marketplace", "positioningSummary", "productBrand", "productImageUrl", "productPrice", "productTitle", "rawProductJson", "rawReviewsJson", "recurringProblems", "remarkableQuotes", "reviewCount", "sentimentScore", "strengthPoints", "weaknessPoints") SELECT "analyzed", "asin", "buyerProfiles", "createdAt", "detectedUsages", "id", "keyFeatures", "marketplace", "positioningSummary", "productBrand", "productImageUrl", "productPrice", "productTitle", "rawProductJson", "rawReviewsJson", "recurringProblems", "remarkableQuotes", "reviewCount", "sentimentScore", "strengthPoints", "weaknessPoints" FROM "ProductIntelligence";
DROP TABLE "ProductIntelligence";
ALTER TABLE "new_ProductIntelligence" RENAME TO "ProductIntelligence";
CREATE UNIQUE INDEX "ProductIntelligence_asin_marketplace_key" ON "ProductIntelligence"("asin", "marketplace");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
