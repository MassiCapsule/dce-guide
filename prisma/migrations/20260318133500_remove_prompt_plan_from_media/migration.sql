-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "toneDescription" TEXT NOT NULL,
    "writingStyle" TEXT NOT NULL,
    "doRules" TEXT NOT NULL,
    "dontRules" TEXT NOT NULL,
    "productStructureTemplate" TEXT NOT NULL,
    "defaultProductWordCount" INTEGER NOT NULL DEFAULT 800,
    "forbiddenWords" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Media" ("id", "name", "description", "toneDescription", "writingStyle", "doRules", "dontRules", "productStructureTemplate", "defaultProductWordCount", "forbiddenWords", "createdAt", "updatedAt") SELECT "id", "name", "description", "toneDescription", "writingStyle", "doRules", "dontRules", "productStructureTemplate", "defaultProductWordCount", "forbiddenWords", "createdAt", "updatedAt" FROM "Media";
DROP TABLE "Media";
ALTER TABLE "new_Media" RENAME TO "Media";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
