-- CreateTable
CREATE TABLE "SkillActivationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillActivationEvent_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SkillActivationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SkillActivationEvent_skillId_createdAt_idx" ON "SkillActivationEvent"("skillId", "createdAt");

-- CreateIndex
CREATE INDEX "SkillActivationEvent_actorId_idx" ON "SkillActivationEvent"("actorId");
