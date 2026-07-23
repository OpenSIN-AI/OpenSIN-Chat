-- Add reconnect correlation to persisted agent runs.
ALTER TABLE "agent_runs" ADD COLUMN "turn_id" TEXT;

-- Persist generated files, reports, code, and other chat/agent outputs.
CREATE TABLE "workspace_artifacts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "threadId" INTEGER,
    "chatId" INTEGER,
    "userId" INTEGER,
    "turnId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mimeType" TEXT,
    "storagePath" TEXT,
    "downloadName" TEXT,
    "content" TEXT,
    "metadata" TEXT,
    "sourceData" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentUuid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_artifacts_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "workspaces" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workspace_artifacts_threadId_fkey"
      FOREIGN KEY ("threadId") REFERENCES "workspace_threads" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "workspace_artifacts_chatId_fkey"
      FOREIGN KEY ("chatId") REFERENCES "workspace_chats" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "workspace_artifacts_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "agent_runs_turn_id_idx" ON "agent_runs"("turn_id");
CREATE UNIQUE INDEX "workspace_artifacts_uuid_key" ON "workspace_artifacts"("uuid");
CREATE INDEX "workspace_artifacts_workspaceId_createdAt_idx"
  ON "workspace_artifacts"("workspaceId", "createdAt");
CREATE INDEX "workspace_artifacts_workspaceId_type_idx"
  ON "workspace_artifacts"("workspaceId", "type");
CREATE INDEX "workspace_artifacts_threadId_idx" ON "workspace_artifacts"("threadId");
CREATE INDEX "workspace_artifacts_chatId_idx" ON "workspace_artifacts"("chatId");
CREATE INDEX "workspace_artifacts_turnId_idx" ON "workspace_artifacts"("turnId");
CREATE INDEX "workspace_artifacts_parentUuid_idx" ON "workspace_artifacts"("parentUuid");
