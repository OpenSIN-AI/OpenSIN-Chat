-- CreateTable
CREATE TABLE "politician_sync_retry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "phase" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastError" TEXT,
    "nextRetryAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "politician_sync_retry_phase_key" ON "politician_sync_retry"("phase");

-- CreateIndex
CREATE INDEX "politician_sync_retry_status_nextRetryAt_idx" ON "politician_sync_retry"("status", "nextRetryAt");
