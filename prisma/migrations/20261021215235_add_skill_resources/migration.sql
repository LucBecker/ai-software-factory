-- CreateTable
CREATE TABLE "SkillResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'text/plain',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SkillResource_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SkillResource_skillId_idx" ON "SkillResource"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillResource_skillId_path_key" ON "SkillResource"("skillId", "path");
