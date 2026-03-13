-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "mediaId" TEXT NOT NULL,
    "guideHtml" TEXT NOT NULL DEFAULT '',
    "guideWordCount" INTEGER NOT NULL DEFAULT 0,
    "guidePromptUsed" TEXT NOT NULL DEFAULT '',
    "guideModelUsed" TEXT NOT NULL DEFAULT 'gpt-4o',
    "guidePromptTokens" INTEGER NOT NULL DEFAULT 0,
    "guideCompletionTokens" INTEGER NOT NULL DEFAULT 0,
    "guideGenerationCost" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Guide_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GuideProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "position" INTEGER NOT NULL,
    "guideId" TEXT NOT NULL,
    "intelligenceId" TEXT NOT NULL,
    "generatedCardId" TEXT,
    "keywordAllocation" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "GuideProduct_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuideProduct_intelligenceId_fkey" FOREIGN KEY ("intelligenceId") REFERENCES "ProductIntelligence" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GuideProduct_generatedCardId_fkey" FOREIGN KEY ("generatedCardId") REFERENCES "GeneratedProductCard" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GuideKeyword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "minOccurrences" INTEGER NOT NULL,
    "maxOccurrences" INTEGER NOT NULL,
    "guideId" TEXT NOT NULL,
    CONSTRAINT "GuideKeyword_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GuideProduct_generatedCardId_key" ON "GuideProduct"("generatedCardId");

-- CreateIndex
CREATE UNIQUE INDEX "GuideProduct_guideId_intelligenceId_key" ON "GuideProduct"("guideId", "intelligenceId");

-- CreateIndex
CREATE UNIQUE INDEX "GuideProduct_guideId_position_key" ON "GuideProduct"("guideId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "GuideKeyword_guideId_keyword_key" ON "GuideKeyword"("guideId", "keyword");
