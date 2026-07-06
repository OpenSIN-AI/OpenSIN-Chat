// SPDX-License-Identifier: MIT
const { WorkspaceChats } = require("../../../models/workspaceChats");

async function resetMemory(
  workspace,
  _message,
  msgUUID,
  user = null,
  thread = null,
) {
  // If thread is present we are wanting to reset this specific thread. Not the whole workspace.
  // Note: user_id/thread_id must be explicitly null (not undefined) because Prisma
  // treats undefined as "ignore this filter" — which would match ALL users' chats
  // instead of only unassigned ones.
  await WorkspaceChats.markThreadHistoryInvalidV2({
    workspaceId: workspace.id,
    user_id: user?.id ?? null,
    thread_id: thread?.id ?? null,
  });

  // If the workspace uses a model router, clear the sticky route and LLM
  // classification cache so the router re-evaluates from scratch.
  const { ModelRouterService } = require("../../router");
  ModelRouterService.resetForWorkspace(workspace, user, thread);

  return {
    uuid: msgUUID,
    type: "textResponse",
    textResponse: "Chat memory was reset!",
    sources: [],
    close: true,
    error: false,
    action: "reset_chat",
  };
}

module.exports = {
  resetMemory,
};
