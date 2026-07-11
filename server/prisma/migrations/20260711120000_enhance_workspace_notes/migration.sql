ALTER TABLE "workspace_notes" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "workspace_notes" ADD COLUMN "plainText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "workspace_notes" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "workspace_notes" ADD COLUMN "folder" TEXT;
ALTER TABLE "workspace_notes" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "workspace_notes" ADD COLUMN "deletedAt" DATETIME;

UPDATE "workspace_notes"
SET "plainText" = "content",
    "title" = CASE
      WHEN instr("content", char(10)) > 0 THEN substr("content", 1, instr("content", char(10)) - 1)
      ELSE substr("content", 1, 120)
    END;

CREATE INDEX "workspace_notes_workspaceId_deletedAt_idx"
ON "workspace_notes"("workspaceId", "deletedAt");
