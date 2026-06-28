// SPDX-License-Identifier: MIT
const prisma = require("../utils/prisma");

const WorkspaceNote = {
  forWorkspace: async function (workspaceId) {
    return await prisma.$queryRawUnsafe(
      "SELECT * FROM workspace_notes WHERE workspaceId = ? ORDER BY pinned DESC, updatedAt DESC",
      workspaceId,
    );
  },

  create: async function (workspaceId, content = "", pinned = false) {
    await prisma.$executeRawUnsafe(
      "INSERT INTO workspace_notes (workspaceId, content, pinned, createdAt, updatedAt) VALUES (?, ?, ?, datetime(\"now\"), datetime(\"now\"))",
      workspaceId,
      content,
      pinned ? 1 : 0,
    );
    const rows = await prisma.$queryRawUnsafe(
      "SELECT * FROM workspace_notes WHERE workspaceId = ? ORDER BY id DESC LIMIT 1",
      workspaceId,
    );
    return Array.isArray(rows) ? rows[0] : rows;
  },

  update: async function (id, data) {
    if (data.content !== undefined) {
      await prisma.$executeRawUnsafe(
        "UPDATE workspace_notes SET content = ?, updatedAt = datetime(\"now\") WHERE id = ?",
        data.content,
        id,
      );
    }
    if (data.pinned !== undefined) {
      await prisma.$executeRawUnsafe(
        "UPDATE workspace_notes SET pinned = ?, updatedAt = datetime(\"now\") WHERE id = ?",
        data.pinned ? 1 : 0,
        id,
      );
    }
    const rows = await prisma.$queryRawUnsafe(
      "SELECT * FROM workspace_notes WHERE id = ?",
      id,
    );
    return Array.isArray(rows) ? rows[0] : rows;
  },

  delete: async function (id) {
    await prisma.$executeRawUnsafe(
      "DELETE FROM workspace_notes WHERE id = ?",
      id,
    );
    return true;
  },
};

module.exports = { WorkspaceNote };
