-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "instructions" TEXT NOT NULL,
    "activationCriteria" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgentSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentSkill_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Skill_category_isActive_idx" ON "Skill"("category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_key_version_key" ON "Skill"("key", "version");

-- CreateIndex
CREATE INDEX "AgentSkill_skillId_idx" ON "AgentSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentSkill_agentId_skillId_key" ON "AgentSkill"("agentId", "skillId");
