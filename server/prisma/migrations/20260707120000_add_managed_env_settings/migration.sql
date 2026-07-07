-- Migration: Phase 4 — DB-backed settings + audit trail
-- Replaces the AnythingLLM anti-pattern of mutating process.env at runtime and
-- dumping application settings back to the .env file. Persistent provider and
-- application settings now live in `managed_env_settings` (encrypted at rest for
-- sensitive keys), and every mutation is recorded in `settings_audit_log`.

CREATE TABLE "managed_env_settings" (
    "id"            INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "envKey"        TEXT     NOT NULL,
    "value"         TEXT,
    "encrypted"     BOOLEAN  NOT NULL DEFAULT false,
    "category"      TEXT,
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "managed_env_settings_envKey_key" ON "managed_env_settings"("envKey");

CREATE TABLE "settings_audit_log" (
    "id"            INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "envKey"        TEXT     NOT NULL,
    "action"        TEXT     NOT NULL DEFAULT 'update',
    "previousValue" TEXT,
    "newValue"      TEXT,
    "redacted"      BOOLEAN  NOT NULL DEFAULT false,
    "userId"        INTEGER,
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "settings_audit_log_envKey_idx" ON "settings_audit_log"("envKey");
CREATE INDEX "settings_audit_log_userId_idx" ON "settings_audit_log"("userId");
CREATE INDEX "settings_audit_log_createdAt_idx" ON "settings_audit_log"("createdAt");
