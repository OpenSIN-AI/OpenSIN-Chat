-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_invites" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "claimedBy" INTEGER,
    "workspaceIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invites_claimedBy_fkey" FOREIGN KEY ("claimedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_invites" ("claimedBy", "code", "createdAt", "createdBy", "id", "lastUpdatedAt", "status", "workspaceIds") SELECT "claimedBy", "code", "createdAt", "createdBy", "id", "lastUpdatedAt", "status", "workspaceIds" FROM "invites";
DROP TABLE "invites";
ALTER TABLE "new_invites" RENAME TO "invites";
CREATE UNIQUE INDEX "invites_code_key" ON "invites"("code");
CREATE INDEX "invites_claimedBy_idx" ON "invites"("claimedBy");
CREATE TABLE "new_event_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event" TEXT NOT NULL,
    "metadata" TEXT,
    "userId" INTEGER,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_event_logs" ("event", "id", "metadata", "occurredAt", "userId") SELECT "event", "id", "metadata", "occurredAt", "userId" FROM "event_logs";
DROP TABLE "event_logs";
ALTER TABLE "new_event_logs" RENAME TO "event_logs";
CREATE INDEX "event_logs_event_idx" ON "event_logs"("event");
CREATE INDEX "event_logs_userId_idx" ON "event_logs"("userId");
CREATE TABLE "new_scheduled_jobs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "tools" TEXT,
    "schedule" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "nextRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_scheduled_jobs" ("createdAt", "enabled", "id", "lastRunAt", "name", "nextRunAt", "prompt", "schedule", "tools", "updatedAt") SELECT "createdAt", "enabled", "id", "lastRunAt", "name", "nextRunAt", "prompt", "schedule", "tools", "updatedAt" FROM "scheduled_jobs";
DROP TABLE "scheduled_jobs";
ALTER TABLE "new_scheduled_jobs" RENAME TO "scheduled_jobs";
CREATE TABLE "new_api_keys" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "secret" TEXT,
    "createdBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_keys_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_api_keys" ("createdAt", "createdBy", "id", "lastUpdatedAt", "name", "secret") SELECT "createdAt", "createdBy", "id", "lastUpdatedAt", "name", "secret" FROM "api_keys";
DROP TABLE "api_keys";
ALTER TABLE "new_api_keys" RENAME TO "api_keys";
CREATE UNIQUE INDEX "api_keys_secret_key" ON "api_keys"("secret");
CREATE INDEX "api_keys_createdBy_idx" ON "api_keys"("createdBy");
CREATE TABLE "new_workspace_documents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "docId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "docpath" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "metadata" TEXT,
    "pinned" BOOLEAN DEFAULT false,
    "watched" BOOLEAN DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_documents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_workspace_documents" ("createdAt", "docId", "docpath", "filename", "id", "lastUpdatedAt", "metadata", "pinned", "watched", "workspaceId") SELECT "createdAt", "docId", "docpath", "filename", "id", "lastUpdatedAt", "metadata", "pinned", "watched", "workspaceId" FROM "workspace_documents";
DROP TABLE "workspace_documents";
ALTER TABLE "new_workspace_documents" RENAME TO "workspace_documents";
CREATE UNIQUE INDEX "workspace_documents_docId_key" ON "workspace_documents"("docId");
CREATE INDEX "workspace_documents_workspaceId_idx" ON "workspace_documents"("workspaceId");
CREATE TABLE "new_model_routers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fallback_provider" TEXT NOT NULL,
    "fallback_model" TEXT NOT NULL,
    "cooldown_seconds" INTEGER NOT NULL DEFAULT 30,
    "created_by" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "model_routers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_model_routers" ("cooldown_seconds", "createdAt", "created_by", "description", "fallback_model", "fallback_provider", "id", "lastUpdatedAt", "name") SELECT "cooldown_seconds", "createdAt", "created_by", "description", "fallback_model", "fallback_provider", "id", "lastUpdatedAt", "name" FROM "model_routers";
DROP TABLE "model_routers";
ALTER TABLE "new_model_routers" RENAME TO "model_routers";
CREATE UNIQUE INDEX "model_routers_name_key" ON "model_routers"("name");
CREATE INDEX "model_routers_created_by_idx" ON "model_routers"("created_by");
CREATE TABLE "new_model_router_rules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "router_id" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'calculated',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "condition_logic" TEXT,
    "conditions" TEXT,
    "route_provider" TEXT NOT NULL,
    "route_model" TEXT NOT NULL,
    "created_by" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "model_router_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "model_router_rules_router_id_fkey" FOREIGN KEY ("router_id") REFERENCES "model_routers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_model_router_rules" ("condition_logic", "conditions", "createdAt", "created_by", "description", "enabled", "id", "lastUpdatedAt", "priority", "route_model", "route_provider", "router_id", "title", "type") SELECT "condition_logic", "conditions", "createdAt", "created_by", "description", "enabled", "id", "lastUpdatedAt", "priority", "route_model", "route_provider", "router_id", "title", "type" FROM "model_router_rules";
DROP TABLE "model_router_rules";
ALTER TABLE "new_model_router_rules" RENAME TO "model_router_rules";
CREATE INDEX "model_router_rules_router_id_idx" ON "model_router_rules"("router_id");
CREATE INDEX "model_router_rules_router_id_enabled_priority_idx" ON "model_router_rules"("router_id", "enabled", "priority");
CREATE INDEX "model_router_rules_created_by_idx" ON "model_router_rules"("created_by");
CREATE UNIQUE INDEX "model_router_rules_router_id_title_key" ON "model_router_rules"("router_id", "title");
CREATE TABLE "new_workspace_chats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workspaceId" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "include" BOOLEAN NOT NULL DEFAULT true,
    "user_id" INTEGER,
    "thread_id" INTEGER,
    "api_session_id" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedbackScore" BOOLEAN,
    "memory_processed" BOOLEAN,
    CONSTRAINT "workspace_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workspace_chats_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_workspace_chats" ("api_session_id", "createdAt", "feedbackScore", "id", "include", "lastUpdatedAt", "memory_processed", "prompt", "response", "thread_id", "user_id", "workspaceId") SELECT "api_session_id", "createdAt", "feedbackScore", "id", "include", "lastUpdatedAt", "memory_processed", "prompt", "response", "thread_id", "user_id", "workspaceId" FROM "workspace_chats";
DROP TABLE "workspace_chats";
ALTER TABLE "new_workspace_chats" RENAME TO "workspace_chats";
CREATE INDEX "workspace_chats_workspaceId_idx" ON "workspace_chats"("workspaceId");
CREATE INDEX "workspace_chats_user_id_idx" ON "workspace_chats"("user_id");
CREATE INDEX "workspace_chats_thread_id_idx" ON "workspace_chats"("thread_id");
CREATE INDEX "workspace_chats_workspaceId_thread_id_idx" ON "workspace_chats"("workspaceId", "thread_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "document_sync_executions_queueId_idx" ON "document_sync_executions"("queueId");

-- CreateIndex
CREATE INDEX "embed_configs_workspace_id_idx" ON "embed_configs"("workspace_id");

-- CreateIndex
CREATE INDEX "embed_configs_usersId_idx" ON "embed_configs"("usersId");

-- CreateIndex
CREATE INDEX "politician_committee_memberships_committeeId_idx" ON "politician_committee_memberships"("committeeId");

-- CreateIndex
CREATE INDEX "prompt_history_modifiedBy_idx" ON "prompt_history"("modifiedBy");

-- CreateIndex
CREATE INDEX "workspace_agent_invocations_workspace_id_idx" ON "workspace_agent_invocations"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_agent_invocations_user_id_idx" ON "workspace_agent_invocations"("user_id");

-- CreateIndex
CREATE INDEX "workspace_parsed_files_threadId_idx" ON "workspace_parsed_files"("threadId");
