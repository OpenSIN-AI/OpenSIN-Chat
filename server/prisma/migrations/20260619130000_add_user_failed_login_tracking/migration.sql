-- AlterTable
ALTER TABLE "users" ADD COLUMN "failed_login_count" INTEGER DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "failed_login_last_at" DATETIME;

-- CreateIndex
CREATE INDEX "users_failed_login_count_idx" ON "users"("failed_login_count");
CREATE INDEX "users_failed_login_last_at_idx" ON "users"("failed_login_last_at");
