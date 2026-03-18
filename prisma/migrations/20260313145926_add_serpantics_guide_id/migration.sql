-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guide" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "criteria" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "mediaId" TEXT NOT NULL,
    "wordCountMin" INTEGER NOT NULL DEFAULT 0,
    "wordCountMax" INTEGER NOT NULL DEFAULT 0,
    "serpanticsGuideId" TEXT NOT NULL DEFAULT '',
    "planHtml" TEXT NOT NULL DEFAULT '',
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
INSERT INTO "new_Guide" ("createdAt", "criteria", "currentStep", "errorMessage", "guideCompletionTokens", "guideGenerationCost", "guideHtml", "guideModelUsed", "guidePromptTokens", "guidePromptUsed", "guideWordCount", "id", "mediaId", "planHtml", "status", "title", "totalCost", "updatedAt", "wordCountMax", "wordCountMin") SELECT "createdAt", "criteria", "currentStep", "errorMessage", "guideCompletionTokens", "guideGenerationCost", "guideHtml", "guideModelUsed", "guidePromptTokens", "guidePromptUsed", "guideWordCount", "id", "mediaId", "planHtml", "status", "title", "totalCost", "updatedAt", "wordCountMax", "wordCountMin" FROM "Guide";
DROP TABLE "Guide";
ALTER TABLE "new_Guide" RENAME TO "Guide";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
