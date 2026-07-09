// SPDX-License-Identifier: MIT
const prisma = require("../utils/prisma");

// P2 fix: shared_workspace_notes is now a Prisma model (schema.prisma).
// The runtime CREATE TABLE IF NOT EXISTS has been removed — use Prisma migrations.
// ensureSharedTable() is kept as a no-op for backward compatibility.

const WorkspaceNote = {
  ensureSharedTable: async function () {
    // No-op: table is managed by Prisma migrations
  },

  get: async function (id) {
    const rows = await prisma.$queryRaw`SELECT * FROM workspace_notes WHERE id = ${Number(id)} LIMIT 1`;
    return Array.isArray(rows) ? rows[0] : rows;
  },

  forWorkspace: async function (workspaceId) {
    return await prisma.$queryRaw`SELECT * FROM workspace_notes WHERE workspaceId = ${workspaceId} ORDER BY pinned DESC, updatedAt DESC`;
  },

  shareToWorkspace: async function (noteId, targetWorkspaceId, userId = null) {
    await this.ensureSharedTable();
    const id = require("crypto").randomUUID();
    const sharedAt = Math.floor(Date.now() / 1000);
    await prisma.$executeRaw`INSERT OR IGNORE INTO shared_workspace_notes (id, note_id, target_workspace_id, shared_by, shared_at) VALUES (${id}, ${Number(noteId)}, ${Number(targetWorkspaceId)}, ${userId ? Number(userId) : null}, ${sharedAt})`;
    const rows = await prisma.$queryRaw`SELECT * FROM shared_workspace_notes WHERE note_id = ${Number(noteId)} AND target_workspace_id = ${Number(targetWorkspaceId)}`;
    return Array.isArray(rows) ? rows[0] : rows;
  },

  unshareFromWorkspace: async function (noteId, targetWorkspaceId) {
    await this.ensureSharedTable();
    await prisma.$executeRaw`DELETE FROM shared_workspace_notes WHERE note_id = ${Number(noteId)} AND target_workspace_id = ${Number(targetWorkspaceId)}`;
    return true;
  },

  sharedToWorkspace: async function (workspaceId) {
    await this.ensureSharedTable();
    return await prisma.$queryRaw`
      SELECT n.*, s.shared_at, s.shared_by, w.slug AS source_workspace_slug, w.name AS source_workspace_name
       FROM shared_workspace_notes s
       JOIN workspace_notes n ON n.id = s.note_id
       JOIN workspaces w ON w.id = n.workspaceId
       WHERE s.target_workspace_id = ${Number(workspaceId)}
       ORDER BY s.shared_at DESC`;
  },

  getShareableWorkspaces: async function (currentWorkspaceId, userId = null) {
    // P0 fix: Only return workspaces the user is a member of.
    // Previously this returned ALL workspaces in the instance, leaking
    // names and slugs of workspaces the user has no access to (IDOR).
    if (!userId) {
      // Single-user mode (no auth): return only the current workspace
      // as there is no membership table to query.
      return await prisma.$queryRaw`SELECT id, name, slug FROM workspaces WHERE id = ${Number(currentWorkspaceId)} ORDER BY name ASC`;
    }
    // Multi-user mode: filter by workspace_users membership
    return await prisma.$queryRaw`
      SELECT w.id, w.name, w.slug
       FROM workspaces w
       JOIN workspace_users wu ON wu.workspace_id = w.id
       WHERE wu.user_id = ${Number(userId)} AND w.id != ${Number(currentWorkspaceId)}
       ORDER BY w.name ASC`;
  },

  create: async function (workspaceId, content = "", pinned = false) {
    // NOTE: datetime('now') MUST use single quotes. Double-quoted "now" is
    // an identifier in SQLite; better-sqlite3 (the Prisma 7 adapter)
    // rejects it with `no such column: "now"`, breaking note creation.
    await prisma.$executeRaw`INSERT INTO workspace_notes (workspaceId, content, pinned, createdAt, updatedAt) VALUES (${workspaceId}, ${content}, ${pinned ? 1 : 0}, datetime('now'), datetime('now'))`;
    const rows = await prisma.$queryRaw`SELECT * FROM workspace_notes WHERE workspaceId = ${workspaceId} ORDER BY id DESC LIMIT 1`;
    return Array.isArray(rows) ? rows[0] : rows;
  },

  update: async function (id, data) {
    if (data.content !== undefined) {
      await prisma.$executeRaw`UPDATE workspace_notes SET content = ${data.content}, updatedAt = datetime('now') WHERE id = ${id}`;
    }
    if (data.pinned !== undefined) {
      await prisma.$executeRaw`UPDATE workspace_notes SET pinned = ${data.pinned ? 1 : 0}, updatedAt = datetime('now') WHERE id = ${id}`;
    }
    const rows = await prisma.$queryRaw`SELECT * FROM workspace_notes WHERE id = ${id}`;
    return Array.isArray(rows) ? rows[0] : rows;
  },

  delete: async function (id) {
    await prisma.$executeRaw`DELETE FROM workspace_notes WHERE id = ${id}`;
    return true;
  },
};

module.exports = { WorkspaceNote };
