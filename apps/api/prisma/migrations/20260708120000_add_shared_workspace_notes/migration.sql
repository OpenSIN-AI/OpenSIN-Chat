-- Migration: add shared_workspace_notes table
-- Replaces the runtime CREATE TABLE IF NOT EXISTS that was in
-- server/models/workspaceNote.js. Now managed via Prisma migrations.

CREATE TABLE IF NOT EXISTS "shared_workspace_notes" (
    "id"                  TEXT    NOT NULL PRIMARY KEY,
    "note_id"             INTEGER NOT NULL,
    "target_workspace_id" INTEGER NOT NULL,
    "shared_by"           INTEGER,
    "shared_at"           INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "shared_workspace_notes_note_id_target_workspace_id_key"
ON "shared_workspace_notes"("note_id", "target_workspace_id");

CREATE INDEX IF NOT EXISTS "shared_workspace_notes_note_id_idx"
ON "shared_workspace_notes"("note_id");

CREATE INDEX IF NOT EXISTS "shared_workspace_notes_target_workspace_id_idx"
ON "shared_workspace_notes"("target_workspace_id");
