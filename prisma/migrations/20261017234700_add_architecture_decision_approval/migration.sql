-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ArchitectureDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "approvedAt" DATETIME,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ArchitectureDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ArchitectureDecision" ("category", "createdAt", "description", "id", "projectId", "title", "updatedAt") SELECT "category", "createdAt", "description", "id", "projectId", "title", "updatedAt" FROM "ArchitectureDecision";
DROP TABLE "ArchitectureDecision";
ALTER TABLE "new_ArchitectureDecision" RENAME TO "ArchitectureDecision";
CREATE INDEX "ArchitectureDecision_projectId_createdAt_idx" ON "ArchitectureDecision"("projectId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
