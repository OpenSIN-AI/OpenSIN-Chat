-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" INTEGER NOT NULL,
    "parent_run_id" TEXT,
    "agent_name" TEXT NOT NULL,
    "model" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" DATETIME
);

-- CreateTable
CREATE TABLE "agent_triggers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" INTEGER NOT NULL,
    "agent_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "checkpoint" TEXT,
    "last_run_at" DATETIME,
    "next_run_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "trigger_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trigger_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "dedupe_key" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "result" TEXT,
    "started_at" DATETIME,
    "ended_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "connector_accounts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL,
    "provider_account" TEXT NOT NULL DEFAULT '',
    "scopes" TEXT,
    "access_token_enc" TEXT NOT NULL,
    "refresh_token_enc" TEXT,
    "token_type" TEXT NOT NULL DEFAULT 'Bearer',
    "expires_at" DATETIME,
    "last_refresh_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "agent_runs_workspace_id_status_idx" ON "agent_runs"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "agent_runs_started_at_idx" ON "agent_runs"("started_at");

-- CreateIndex
CREATE INDEX "agent_triggers_workspace_id_idx" ON "agent_triggers"("workspace_id");

-- CreateIndex
CREATE INDEX "agent_triggers_active_next_run_at_idx" ON "agent_triggers"("active", "next_run_at");

-- CreateIndex
CREATE INDEX "trigger_runs_trigger_id_created_at_idx" ON "trigger_runs"("trigger_id", "created_at");

-- CreateIndex
CREATE INDEX "trigger_runs_dedupe_key_status_idx" ON "trigger_runs"("dedupe_key", "status");

-- CreateIndex
CREATE INDEX "connector_accounts_user_id_idx" ON "connector_accounts"("user_id");

-- CreateIndex
CREATE INDEX "connector_accounts_status_idx" ON "connector_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "connector_accounts_user_id_provider_provider_account_key" ON "connector_accounts"("user_id", "provider", "provider_account");
