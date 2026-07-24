// SPDX-License-Identifier: MIT
const { Workspace } = require("../../models/workspace");

async function assertWorkspaceAccess(workspaceId, user) {
  if (!user) throw new Error("Authentication required");

  const id = Number(workspaceId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid workspace id");

  const workspace = await Workspace.getWithUser(user, { id });
  if (!workspace) throw new Error("Workspace not found or access denied");

  return workspace;
}

module.exports = { assertWorkspaceAccess };
