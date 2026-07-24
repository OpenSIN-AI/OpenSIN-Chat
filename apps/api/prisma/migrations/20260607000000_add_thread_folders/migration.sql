-- CreateTable
CREATE TABLE "workspace_thread_folders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_thread_folders_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workspace_thread_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable: add folder_id to workspace_threads
ALTER TABLE "workspace_threads" ADD COLUMN "folder_id" INTEGER REFERENCES "workspace_thread_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "workspace_thread_folders_workspace_id_idx" ON "workspace_thread_folders"("workspace_id");
CREATE INDEX "workspace_thread_folders_user_id_idx" ON "workspace_thread_folders"("user_id");
CREATE INDEX "workspace_threads_folder_id_idx" ON "workspace_threads"("folder_id");
