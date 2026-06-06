-- CreateTable
CREATE TABLE "politicians" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'bundestag',
    "title" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "party" TEXT,
    "faction" TEXT,
    "gender" TEXT,
    "birthDate" DATETIME,
    "birthPlace" TEXT,
    "deathDate" DATETIME,
    "profession" TEXT,
    "education" TEXT,
    "religion" TEXT,
    "familyStatus" TEXT,
    "photoUrl" TEXT,
    "websiteUrl" TEXT,
    "email" TEXT,
    "twitterHandle" TEXT,
    "facebookUrl" TEXT,
    "linkedinUrl" TEXT,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "tiktokUrl" TEXT,
    "bio" TEXT,
    "profileUrl" TEXT,
    "electoralDistrict" TEXT,
    "electoralList" TEXT,
    "state" TEXT,
    "rawData" TEXT,
    "lastSyncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "politician_mandates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "politicianId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'bundestag',
    "position" TEXT,
    "party" TEXT,
    "faction" TEXT,
    "electoralDistrict" TEXT,
    "state" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "info" TEXT,
    "rawData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "politician_mandates_politicianId_fkey" FOREIGN KEY ("politicianId") REFERENCES "politicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "politician_votes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "politicianId" TEXT NOT NULL,
    "session" INTEGER,
    "sitting" INTEGER,
    "voteId" TEXT,
    "voteTitle" TEXT,
    "voteDescription" TEXT,
    "voteResult" TEXT,
    "voteDate" DATETIME,
    "documentUrl" TEXT,
    "plenaryProtocolUrl" TEXT,
    "rawData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "politician_votes_politicianId_fkey" FOREIGN KEY ("politicianId") REFERENCES "politicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "politician_speeches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "politicianId" TEXT NOT NULL,
    "session" INTEGER,
    "sitting" INTEGER,
    "speechTitle" TEXT,
    "speechText" TEXT NOT NULL,
    "speechDate" DATETIME,
    "documentUrl" TEXT,
    "pageNumbers" TEXT,
    "rawData" TEXT,
    "vectorized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "politician_speeches_politicianId_fkey" FOREIGN KEY ("politicianId") REFERENCES "politicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "politician_committees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fullName" TEXT,
    "type" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "politician_committee_memberships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "politicianId" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "role" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "politician_committee_memberships_politicianId_fkey" FOREIGN KEY ("politicianId") REFERENCES "politicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "politician_committee_memberships_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "politician_committees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "politician_sync_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'started',
    "itemsTotal" INTEGER NOT NULL DEFAULT 0,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "details" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "politicians_externalId_key" ON "politicians"("externalId");

-- CreateIndex
CREATE INDEX "politicians_source_idx" ON "politicians"("source");

-- CreateIndex
CREATE INDEX "politicians_lastName_idx" ON "politicians"("lastName");

-- CreateIndex
CREATE INDEX "politicians_party_idx" ON "politicians"("party");

-- CreateIndex
CREATE INDEX "politicians_state_idx" ON "politicians"("state");

-- CreateIndex
CREATE INDEX "politician_mandates_politicianId_idx" ON "politician_mandates"("politicianId");

-- CreateIndex
CREATE INDEX "politician_mandates_type_idx" ON "politician_mandates"("type");

-- CreateIndex
CREATE INDEX "politician_votes_politicianId_idx" ON "politician_votes"("politicianId");

-- CreateIndex
CREATE INDEX "politician_votes_session_idx" ON "politician_votes"("session");

-- CreateIndex
CREATE INDEX "politician_votes_voteDate_idx" ON "politician_votes"("voteDate");

-- CreateIndex
CREATE INDEX "politician_speeches_politicianId_idx" ON "politician_speeches"("politicianId");

-- CreateIndex
CREATE INDEX "politician_speeches_speechDate_idx" ON "politician_speeches"("speechDate");

-- CreateIndex
CREATE INDEX "politician_speeches_vectorized_idx" ON "politician_speeches"("vectorized");

-- CreateIndex
CREATE UNIQUE INDEX "politician_committees_name_key" ON "politician_committees"("name");

-- CreateIndex
CREATE UNIQUE INDEX "politician_committee_memberships_politicianId_committeeId_key" ON "politician_committee_memberships"("politicianId", "committeeId");
