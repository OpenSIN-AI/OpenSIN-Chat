-- DropIndex
DROP INDEX "workspace_agent_invocations_uuid_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN "dailyMessageResetAt" DATETIME;
ALTER TABLE "users" ADD COLUMN "dailyMessageUsedAt" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "workspace_documents" ADD COLUMN "contextMode" TEXT DEFAULT 'off';

-- CreateTable
CREATE TABLE "transformations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "applyDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "document_insights" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "docId" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "transformationId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_insights_transformationId_fkey" FOREIGN KEY ("transformationId") REFERENCES "transformations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "document_insights_docId_idx" ON "document_insights"("docId");

-- CreateIndex
CREATE INDEX "document_insights_workspaceId_idx" ON "document_insights"("workspaceId");

-- CreateIndex
CREATE INDEX "cache_data_expiresAt_idx" ON "cache_data"("expiresAt");

-- CreateIndex
CREATE INDEX "cache_data_belongsTo_idx" ON "cache_data"("belongsTo");

-- CreateIndex
CREATE INDEX "document_sync_queues_nextSyncAt_idx" ON "document_sync_queues"("nextSyncAt");

-- CreateIndex
CREATE INDEX "embed_chats_session_id_idx" ON "embed_chats"("session_id");

-- CreateIndex
CREATE INDEX "event_logs_occurredAt_idx" ON "event_logs"("occurredAt");

-- CreateIndex
CREATE INDEX "memories_workspace_id_idx" ON "memories"("workspace_id");

-- CreateIndex
CREATE INDEX "politician_sync_log_source_idx" ON "politician_sync_log"("source");

-- CreateIndex
CREATE INDEX "politician_sync_log_status_idx" ON "politician_sync_log"("status");

-- CreateIndex
CREATE INDEX "politician_sync_log_startedAt_idx" ON "politician_sync_log"("startedAt");

-- CreateIndex
CREATE INDEX "politician_sync_retry_status_nextRetryAt_idx" ON "politician_sync_retry"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "scheduled_job_runs_status_idx" ON "scheduled_job_runs"("status");

-- CreateIndex
CREATE INDEX "scheduled_jobs_enabled_nextRunAt_idx" ON "scheduled_jobs"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "slash_command_presets_userId_idx" ON "slash_command_presets"("userId");

-- CreateIndex
CREATE INDEX "workspace_agent_invocations_thread_id_idx" ON "workspace_agent_invocations"("thread_id");

-- CreateIndex
CREATE INDEX "workspace_chats_api_session_id_idx" ON "workspace_chats"("api_session_id");
