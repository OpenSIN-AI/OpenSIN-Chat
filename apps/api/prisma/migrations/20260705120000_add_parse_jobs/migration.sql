-- Migration: add parse_jobs table
-- Replaces the previous in-memory Map in server/utils/parseJobs/index.js so
-- async parse jobs survive server restarts and Docker/Mac-sleep cycles.

CREATE TABLE "parse_jobs" (
    "id"           TEXT     NOT NULL PRIMARY KEY,
    "workspaceId"  INTEGER  NOT NULL,
    "userId"       INTEGER,
    "originalname" TEXT     NOT NULL,
    "status"       TEXT     NOT NULL DEFAULT 'pending',
    "files"        TEXT,
    "error"        TEXT,
    "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt"   DATETIME
);

CREATE INDEX "parse_jobs_workspaceId_status_idx" ON "parse_jobs"("workspaceId", "status");
CREATE INDEX "parse_jobs_createdAt_idx" ON "parse_jobs"("createdAt");
