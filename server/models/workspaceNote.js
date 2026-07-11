// SPDX-License-Identifier: MIT
const prisma = require("../utils/prisma");
const crypto = require("crypto");

const WorkspaceNote = {
  ensureSharedTable: async function () {},

  get: async function (id) {
    const rows = await prisma.$queryRaw`SELECT * FROM workspace_notes WHERE id = ${Number(id)} LIMIT 1`;
    return Array.isArray(rows) ? rows[0] : rows;
  },

  forWorkspace: async function (workspaceId, { trash = false } = {}) {
    if (trash) {
      return await prisma.$queryRaw`SELECT * FROM workspace_notes WHERE workspaceId = ${Number(workspaceId)} AND deletedAt IS NOT NULL ORDER BY deletedAt DESC`;
    }
    return await prisma.$queryRaw`SELECT * FROM workspace_notes WHERE workspaceId = ${Number(workspaceId)} AND deletedAt IS NULL ORDER BY pinned DESC, updatedAt DESC`;
  },

  shareToWorkspace: async function (noteId, targetWorkspaceId, userId = null) {
    const id = crypto.randomUUID();
    const sharedAt = Math.floor(Date.now() / 1000);
    await prisma.$executeRaw`INSERT OR IGNORE INTO shared_workspace_notes (id, note_id, target_workspace_id, shared_by, shared_at) VALUES (${id}, ${Number(noteId)}, ${Number(targetWorkspaceId)}, ${userId ? Number(userId) : null}, ${sharedAt})`;
    const rows = await prisma.$queryRaw`SELECT * FROM shared_workspace_notes WHERE note_id = ${Number(noteId)} AND target_workspace_id = ${Number(targetWorkspaceId)}`;
    return Array.isArray(rows) ? rows[0] : rows;
  },

  unshareFromWorkspace: async function (noteId, targetWorkspaceId) {
    await prisma.$executeRaw`DELETE FROM shared_workspace_notes WHERE note_id = ${Number(noteId)} AND target_workspace_id = ${Number(targetWorkspaceId)}`;
    return true;
  },

  sharedToWorkspace: async function (workspaceId) {
    return await prisma.$queryRaw`
      SELECT n.*, s.shared_at, s.shared_by, w.slug AS source_workspace_slug, w.name AS source_workspace_name
      FROM shared_workspace_notes s
      JOIN workspace_notes n ON n.id = s.note_id
      JOIN workspaces w ON w.id = n.workspaceId
      WHERE s.target_workspace_id = ${Number(workspaceId)} AND n.deletedAt IS NULL
      ORDER BY s.shared_at DESC`;
  },

  getShareableWorkspaces: async function (currentWorkspaceId, userId = null) {
    if (!userId) {
      return await prisma.$queryRaw`SELECT id, name, slug FROM workspaces WHERE id = ${Number(currentWorkspaceId)} ORDER BY name ASC`;
    }
    return await prisma.$queryRaw`
      SELECT w.id, w.name, w.slug FROM workspaces w
      JOIN workspace_users wu ON wu.workspace_id = w.id
      WHERE wu.user_id = ${Number(userId)} AND w.id != ${Number(currentWorkspaceId)}
      ORDER BY w.name ASC`;
  },

  create: async function (workspaceId, content = "", pinned = false, metadata = {}) {
    const { title = "", plainText = "", tags = "[]", folder = null } = metadata;
    await prisma.$executeRaw`INSERT INTO workspace_notes (workspaceId, title, content, plainText, tags, folder, pinned, createdAt, updatedAt) VALUES (${Number(workspaceId)}, ${title}, ${content}, ${plainText}, ${tags}, ${folder}, ${pinned ? 1 : 0}, datetime('now'), datetime('now'))`;
    const rows = await prisma.$queryRaw`SELECT * FROM workspace_notes WHERE workspaceId = ${Number(workspaceId)} ORDER BY id DESC LIMIT 1`;
    return Array.isArray(rows) ? rows[0] : rows;
  },

  update: async function (id, data) {
    if (data.title !== undefined) await prisma.$executeRaw`UPDATE workspace_notes SET title = ${data.title}, updatedAt = datetime('now') WHERE id = ${Number(id)}`;
    if (data.content !== undefined) await prisma.$executeRaw`UPDATE workspace_notes SET content = ${data.content}, updatedAt = datetime('now') WHERE id = ${Number(id)}`;
    if (data.plainText !== undefined) await prisma.$executeRaw`UPDATE workspace_notes SET plainText = ${data.plainText}, updatedAt = datetime('now') WHERE id = ${Number(id)}`;
    if (data.tags !== undefined) await prisma.$executeRaw`UPDATE workspace_notes SET tags = ${data.tags}, updatedAt = datetime('now') WHERE id = ${Number(id)}`;
    if (data.folder !== undefined) await prisma.$executeRaw`UPDATE workspace_notes SET folder = ${data.folder}, updatedAt = datetime('now') WHERE id = ${Number(id)}`;
    if (data.pinned !== undefined) await prisma.$executeRaw`UPDATE workspace_notes SET pinned = ${data.pinned ? 1 : 0}, updatedAt = datetime('now') WHERE id = ${Number(id)}`;
    const rows = await prisma.$queryRaw`SELECT * FROM workspace_notes WHERE id = ${Number(id)}`;
    return Array.isArray(rows) ? rows[0] : rows;
  },

  trash: async function (id) {
    await prisma.$executeRaw`UPDATE workspace_notes SET deletedAt = datetime('now'), updatedAt = datetime('now') WHERE id = ${Number(id)}`;
    return true;
  },

  restore: async function (id) {
    await prisma.$executeRaw`UPDATE workspace_notes SET deletedAt = NULL, updatedAt = datetime('now') WHERE id = ${Number(id)}`;
    return true;
  },

  delete: async function (id) {
    await prisma.$executeRaw`DELETE FROM workspace_notes WHERE id = ${Number(id)}`;
    return true;
  },
};

module.exports = { WorkspaceNote };
