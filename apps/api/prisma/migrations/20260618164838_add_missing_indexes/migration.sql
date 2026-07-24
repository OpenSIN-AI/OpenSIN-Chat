-- CreateIndex
CREATE INDEX "document_vectors_docId_idx" ON "document_vectors"("docId");

-- CreateIndex
CREATE INDEX "embed_chats_embed_id_idx" ON "embed_chats"("embed_id");

-- CreateIndex
CREATE INDEX "embed_chats_usersId_idx" ON "embed_chats"("usersId");

-- CreateIndex
CREATE INDEX "workspace_chats_workspaceId_idx" ON "workspace_chats"("workspaceId");

-- CreateIndex
CREATE INDEX "workspace_chats_user_id_idx" ON "workspace_chats"("user_id");

-- CreateIndex
CREATE INDEX "workspace_chats_thread_id_idx" ON "workspace_chats"("thread_id");

-- CreateIndex
CREATE INDEX "workspace_chats_workspaceId_thread_id_idx" ON "workspace_chats"("workspaceId", "thread_id");

-- CreateIndex
CREATE INDEX "workspace_documents_workspaceId_idx" ON "workspace_documents"("workspaceId");

-- CreateIndex
CREATE INDEX "workspace_users_user_id_idx" ON "workspace_users"("user_id");

-- CreateIndex
CREATE INDEX "workspace_users_workspace_id_idx" ON "workspace_users"("workspace_id");
