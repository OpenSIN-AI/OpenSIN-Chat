-- DropIndex
DROP INDEX "politician_sync_retry_status_nextRetryAt_idx";

-- AlterTable
ALTER TABLE "memories" ADD COLUMN "embedding" vector(1536);

-- AlterTable
ALTER TABLE "politician_speeches" ADD COLUMN "dedupeKey" TEXT;
ALTER TABLE "politician_speeches" ADD COLUMN "matchConfidence" REAL;
ALTER TABLE "politician_speeches" ADD COLUMN "speakerName" TEXT;
ALTER TABLE "politician_speeches" ADD COLUMN "speakerParty" TEXT;
ALTER TABLE "politician_speeches" ADD COLUMN "updatedAt" DATETIME;

-- CreateTable
CREATE TABLE "job_queue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "job_name" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "last_error" TEXT,
    "locked_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "job_queue_status_created_at_idx" ON "job_queue"("status", "created_at");

-- CreateIndex
CREATE INDEX "job_queue_status_locked_at_idx" ON "job_queue"("status", "locked_at");

-- CreateIndex
CREATE UNIQUE INDEX "politician_speeches_dedupeKey_key" ON "politician_speeches"("dedupeKey");

-- CreateIndex
CREATE INDEX "politician_speeches_dedupeKey_idx" ON "politician_speeches"("dedupeKey");
