-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "instructions" TEXT NOT NULL,
    "rulesJson" TEXT NOT NULL DEFAULT '[]',
    "activationCriteria" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" DATETIME,
    "approvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Skill_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Skill" ("activationCriteria", "approvedAt", "approvedById", "category", "createdAt", "description", "id", "instructions", "isActive", "key", "name", "reviewStatus", "updatedAt", "version") SELECT "activationCriteria", "approvedAt", "approvedById", "category", "createdAt", "description", "id", "instructions", "isActive", "key", "name", "reviewStatus", "updatedAt", "version" FROM "Skill";
DROP TABLE "Skill";
ALTER TABLE "new_Skill" RENAME TO "Skill";
CREATE INDEX "Skill_category_isActive_idx" ON "Skill"("category", "isActive");
CREATE INDEX "Skill_reviewStatus_idx" ON "Skill"("reviewStatus");
CREATE INDEX "Skill_approvedById_idx" ON "Skill"("approvedById");
CREATE UNIQUE INDEX "Skill_key_version_key" ON "Skill"("key", "version");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
