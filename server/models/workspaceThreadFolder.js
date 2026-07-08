// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const prisma = require("../utils/prisma");

const WorkspaceThreadFolder = {
  // List all folders for a workspace (+ user scope in multi-user mode)
  where: async function ({ workspace_id, user_id = null }) {
    if (workspace_id === undefined || workspace_id === null) return [];
    const filters = { workspace_id };
    if (user_id !== undefined && user_id !== null) filters.user_id = user_id;

    // ==========================================
    // <-- ÄNDERUNG: Sortierung der Ordner
    // ==========================================
    // Vorher: orderBy: { createdAt: "asc" }
    // Nachher: orderBy: { createdAt: "desc" } -> Neue Ordner docken oben an
    return await prisma.workspace_thread_folders
      .findMany({ where: filters, orderBy: { createdAt: "desc" }, take: 100 })
      .catch(() => []);
  },

  new: async function (workspace, userId = null, name = "New Folder") {
    if (!name?.trim()) return { folder: null, message: "Name is required." };
    try {
      const folder = await prisma.workspace_thread_folders.create({
        data: {
          name: name.trim().slice(0, 255),
          workspace_id: workspace.id,
          user_id: userId ?? null,
        },
      });
      return { folder, message: null };
    } catch (e) {
      consoleLogger.error("WorkspaceThreadFolder.new:", e.message);
      return { folder: null, message: e.message };
    }
  },

  update: async function (
    folderId,
    data = {},
    workspaceId = null,
    userId = null,
  ) {
    const allowed = {};
    if (data.name?.trim()) allowed.name = data.name.trim().slice(0, 255);
    if (!Object.keys(allowed).length)
      return { folder: null, message: "Nothing to update." };
    try {
      // When workspaceId is provided, verify the folder belongs to that
      // workspace before updating to prevent cross-workspace modification.
      // When userId is provided, also verify the folder belongs to that
      // user to prevent cross-user modification in multi-user mode.
      if (workspaceId !== null) {
        const where = {
          id: Number(folderId),
          workspace_id: Number(workspaceId),
        };
        if (userId !== null) where.user_id = userId;
        const existing = await prisma.workspace_thread_folders.findFirst({
          where,
          select: { id: true },
        });
        if (!existing)
          return {
            folder: null,
            message: "Folder not found in this workspace.",
          };
      }

      const folder = await prisma.workspace_thread_folders.update({
        where: { id: Number(folderId) },
        data: { ...allowed, lastUpdatedAt: new Date() },
      });
      return { folder, message: null };
    } catch (e) {
      consoleLogger.error("WorkspaceThreadFolder.update:", e.message);
      return { folder: null, message: e.message };
    }
  },

  delete: async function (folderId, workspaceId = null, userId = null) {
    try {
      // When workspaceId is provided, verify the folder belongs to that
      // workspace before deleting to prevent cross-workspace deletion.
      // When userId is provided, also verify the folder belongs to that
      // user to prevent cross-user deletion in multi-user mode.
      if (workspaceId !== null) {
        const where = {
          id: Number(folderId),
          workspace_id: Number(workspaceId),
        };
        if (userId !== null) where.user_id = userId;
        const existing = await prisma.workspace_thread_folders.findFirst({
          where,
          select: { id: true },
        });
        if (!existing) {
          consoleLogger.error(
            "WorkspaceThreadFolder.delete: folder does not belong to workspace",
          );
          return false;
        }
      }

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
      consoleLogger.error("WorkspaceThreadFolder.delete:", e.message);
      return false;
    }
  },

  assignThread: async function (threadId, folderId = null) {
    try {
      // Unassigning (folderId = null) is always safe.
      if (folderId) {
        // Verify the folder belongs to the same workspace as the thread
        // to prevent cross-workspace assignment. Also verify the folder
        // belongs to the same user as the thread to prevent cross-user
        // assignment in multi-user mode.
        const thread = await prisma.workspace_threads.findFirst({
          where: { id: Number(threadId) },
          select: { workspace_id: true, user_id: true },
        });
        if (!thread) return false;

        const folder = await prisma.workspace_thread_folders.findFirst({
          where: { id: Number(folderId) },
          select: { workspace_id: true, user_id: true },
        });
        if (!folder) return false;

        if (thread.workspace_id !== folder.workspace_id) {
          consoleLogger.error(
            "WorkspaceThreadFolder.assignThread: thread and folder belong to different workspaces",
          );
          return false;
        }

        if (thread.user_id !== folder.user_id) {
          consoleLogger.error(
            "WorkspaceThreadFolder.assignThread: thread and folder belong to different users",
          );
          return false;
        }
      }

      await prisma.workspace_threads.update({
        where: { id: Number(threadId) },
        data: { folder_id: folderId ? Number(folderId) : null },
      });
      return true;
    } catch (e) {
      consoleLogger.error("WorkspaceThreadFolder.assignThread:", e.message);
      return false;
    }
  },
};

module.exports = { WorkspaceThreadFolder };
