// SPDX-License-Identifier: MIT
const prisma = require("../utils/prisma");
const crypto = require("crypto");

const WorkspaceNote = {
  ensureSharedTable: async function () {},

  get: async function (id) {
    return await prisma.workspace_notes.findFirst({
      where: { id: Number(id) },
    });
  },

  forWorkspace: async function (workspaceId, { trash = false } = {}) {
    if (trash) {
      return await prisma.workspace_notes.findMany({
        where: {
          workspaceId: Number(workspaceId),
          deletedAt: { not: null },
        },
        orderBy: { deletedAt: "desc" },
      });
    }
    return await prisma.workspace_notes.findMany({
      where: {
        workspaceId: Number(workspaceId),
        deletedAt: null,
      },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    });
  },

  shareToWorkspace: async function (noteId, targetWorkspaceId, userId = null) {
    const id = crypto.randomUUID();
    const sharedAt = Math.floor(Date.now() / 1000);
    await prisma.shared_workspace_notes.create({
      data: {
        id,
        note_id: Number(noteId),
        target_workspace_id: Number(targetWorkspaceId),
        shared_by: userId ? Number(userId) : null,
        shared_at: sharedAt,
      },
    });
    return await prisma.shared_workspace_notes.findFirst({
      where: {
        note_id: Number(noteId),
        target_workspace_id: Number(targetWorkspaceId),
      },
    });
  },

  unshareFromWorkspace: async function (noteId, targetWorkspaceId) {
    await prisma.shared_workspace_notes.deleteMany({
      where: {
        note_id: Number(noteId),
        target_workspace_id: Number(targetWorkspaceId),
      },
    });
    return true;
  },

  sharedToWorkspace: async function (workspaceId) {
    const shares = await prisma.shared_workspace_notes.findMany({
      where: { target_workspace_id: Number(workspaceId) },
      orderBy: { shared_at: "desc" },
    });
    const result = [];
    for (const s of shares) {
      const note = await prisma.workspace_notes.findFirst({
        where: { id: s.note_id, deletedAt: null },
      });
      if (!note) continue;
      const ws = await prisma.workspaces.findFirst({
        where: { id: note.workspaceId },
      });
      result.push({
        ...note,
        shared_at: s.shared_at,
        shared_by: s.shared_by,
        source_workspace_slug: ws?.slug,
        source_workspace_name: ws?.name,
      });
    }
    return result;
  },

  getShareableWorkspaces: async function (currentWorkspaceId, userId = null) {
    if (!userId) {
      return await prisma.workspaces.findMany({
        where: { id: Number(currentWorkspaceId) },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      });
    }
    return await prisma.workspaces.findMany({
      where: {
        workspace_users: { some: { user_id: Number(userId) } },
        id: { not: Number(currentWorkspaceId) },
      },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
  },

  create: async function (
    workspaceId,
    content = "",
    pinned = false,
    metadata = {},
  ) {
    const { title = "", plainText = "", tags = "[]", folder = null } = metadata;
    return await prisma.workspace_notes.create({
      data: {
        workspaceId: Number(workspaceId),
        title,
        content,
        plainText,
        tags,
        folder,
        pinned: Boolean(pinned),
      },
    });
  },

  update: async function (id, data) {
    const updateData = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.plainText !== undefined) updateData.plainText = data.plainText;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.folder !== undefined) updateData.folder = data.folder;
    if (data.pinned !== undefined) updateData.pinned = Boolean(data.pinned);
    return await prisma.workspace_notes.update({
      where: { id: Number(id) },
      data: updateData,
    });
  },

  trash: async function (id) {
    await prisma.workspace_notes.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    return true;
  },

  restore: async function (id) {
    await prisma.workspace_notes.update({
      where: { id: Number(id) },
      data: { deletedAt: null, updatedAt: new Date() },
    });
    return true;
  },

  delete: async function (id) {
    await prisma.workspace_notes.delete({
      where: { id: Number(id) },
    });
    return true;
  },
};

module.exports = { WorkspaceNote };
