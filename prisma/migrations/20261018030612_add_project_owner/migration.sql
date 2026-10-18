-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "stage" TEXT NOT NULL DEFAULT 'Brainstorming',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("createdAt", "description", "id", "name", "stage", "status", "updatedAt") SELECT "createdAt", "description", "id", "name", "stage", "status", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");
CREATE INDEX "Project_userId_idx" ON "Project"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
