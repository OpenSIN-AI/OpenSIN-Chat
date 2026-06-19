// SPDX-License-Identifier: MIT
const prisma = require("../utils/prisma");

const WorkspaceThreadFolder = {
  // List all folders for a workspace (+ user scope in multi-user mode)
  where: async function ({ workspace_id, user_id = null }) {
    if (workspace_id === undefined || workspace_id === null) return [];
    const filters = { workspace_id };
    if (user_id !== undefined) filters.user_id = user_id;

    // ==========================================
    // <-- ÄNDERUNG: Sortierung der Ordner
    // ==========================================
    // Vorher: orderBy: { createdAt: "asc" }
    // Nachher: orderBy: { createdAt: "desc" } -> Neue Ordner docken oben an
    return await prisma.workspace_thread_folders
      .findMany({ where: filters, orderBy: { createdAt: "desc" } })
      .catch(() => []);
  },

  new: async function (workspace, userId = null, name = "New Folder") {
    if (!name?.trim()) return { folder: null, message: "Name is required." };
    try {
      const folder = await prisma.workspace_thread_folders.create({
        data: {
          name: name.trim(),
          workspace_id: workspace.id,
          user_id: userId ?? null,
        },
      });
      return { folder, message: null };
    } catch (e) {
      console.error("WorkspaceThreadFolder.new:", e.message);
      return { folder: null, message: e.message };
    }
  },

  update: async function (folderId, data = {}) {
    const allowed = {};
    if (data.name?.trim()) allowed.name = data.name.trim();
    if (!Object.keys(allowed).length)
      return { folder: null, message: "Nothing to update." };
    try {
      const folder = await prisma.workspace_thread_folders.update({
        where: { id: Number(folderId) },
        data: { ...allowed, lastUpdatedAt: new Date() },
      });
      return { folder, message: null };
    } catch (e) {
      console.error("WorkspaceThreadFolder.update:", e.message);
      return { folder: null, message: e.message };
    }
  },

  delete: async function (folderId) {
    try {
      await prisma.$transaction([
        prisma.workspace_threads.updateMany({
          where: { folder_id: Number(folderId) },
          data: { folder_id: null },
        }),
        prisma.workspace_thread_folders.delete({
          where: { id: Number(folderId) },
        }),
      ]);
      return true;
    } catch (e) {
      console.error("WorkspaceThreadFolder.delete:", e.message);
      return false;
    }
  },

  assignThread: async function (threadId, folderId = null) {
    try {
      await prisma.workspace_threads.update({
        where: { id: Number(threadId) },
        data: { folder_id: folderId ? Number(folderId) : null },
      });
      return true;
    } catch (e) {
      console.error("WorkspaceThreadFolder.assignThread:", e.message);
      return false;
    }
  },
};

module.exports = { WorkspaceThreadFolder };
