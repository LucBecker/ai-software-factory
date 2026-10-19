-- CreateTable
CREATE TABLE "ProjectProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "softwareType" TEXT NOT NULL DEFAULT 'UNDECIDED',
    "targetPlatform" TEXT NOT NULL DEFAULT 'UNDECIDED',
    "preferredLanguages" TEXT NOT NULL DEFAULT '[]',
    "preferredFrameworks" TEXT NOT NULL DEFAULT '[]',
    "databasePreference" TEXT NOT NULL DEFAULT 'UNDECIDED',
    "deploymentTarget" TEXT NOT NULL DEFAULT 'UNDECIDED',
    "integrations" TEXT NOT NULL DEFAULT '[]',
    "securityRequirements" TEXT NOT NULL DEFAULT '',
    "performanceRequirements" TEXT NOT NULL DEFAULT '',
    "budgetConstraints" TEXT NOT NULL DEFAULT '',
    "otherConstraints" TEXT NOT NULL DEFAULT '',
    "additionalContext" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectProfile_projectId_key" ON "ProjectProfile"("projectId");

-- CreateIndex
CREATE INDEX "ProjectProfile_softwareType_idx" ON "ProjectProfile"("softwareType");
