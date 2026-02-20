-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "toneDescription" TEXT NOT NULL,
    "writingStyle" TEXT NOT NULL,
    "doRules" TEXT NOT NULL,
    "dontRules" TEXT NOT NULL,
    "productStructureTemplate" TEXT NOT NULL,
    "defaultProductWordCount" INTEGER NOT NULL DEFAULT 800,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductIntelligence" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GeneratedProductCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asin" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "promptUsed" TEXT NOT NULL,
    "modelUsed" TEXT NOT NULL DEFAULT 'gpt-4o',
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mediaId" TEXT NOT NULL,
    "intelligenceId" TEXT NOT NULL,
    CONSTRAINT "GeneratedProductCard_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GeneratedProductCard_intelligenceId_fkey" FOREIGN KEY ("intelligenceId") REFERENCES "ProductIntelligence" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductIntelligence_asin_marketplace_key" ON "ProductIntelligence"("asin", "marketplace");
