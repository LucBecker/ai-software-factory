-- CreateTable
CREATE TABLE "DevelopmentTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sourcePlanRunId" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "requirement" TEXT NOT NULL DEFAULT '',
    "dependencies" TEXT NOT NULL DEFAULT '[]',
    "expectedResult" TEXT NOT NULL DEFAULT '',
    "acceptanceCriteria" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DevelopmentTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DevelopmentTask_projectId_createdAt_idx" ON "DevelopmentTask"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "DevelopmentTask_status_idx" ON "DevelopmentTask"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DevelopmentTask_sourcePlanRunId_taskKey_key" ON "DevelopmentTask"("sourcePlanRunId", "taskKey");
