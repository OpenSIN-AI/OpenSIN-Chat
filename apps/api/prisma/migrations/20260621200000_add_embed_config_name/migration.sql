-- AlterTable
-- Add name column to embed_configs (nullable for backward compatibility)
ALTER TABLE "embed_configs" ADD COLUMN "name" TEXT;
