const { Workspace } = require("../models/workspace");

async function assertWorkspaceAccess(workspaceId, user) {
  if (!user) throw new Error("Authentication required");
  const workspace = await Workspace.get(workspaceId);
  if (!workspace) throw new Error("Workspace not found");

  const userId = user.id;
  const { workspace_users } = workspace;
  if (!workspace_users || workspace_users.length === 0) {
    throw new Error("No workspace users found");
  }

  const isMember = workspace_users.some((wu) => wu.userId === userId);
  if (!isMember && user.role !== "admin") {
    throw new Error("You do not have access to this workspace");
  }

  return workspace;
}

module.exports = { assertWorkspaceAccess };
