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
    const rows = await prisma.$queryRawUnsafe(
      "SELECT * FROM workspace_notes WHERE id = ? LIMIT 1",
      Number(id),
    );
    return Array.isArray(rows) ? rows[0] : rows;
  },

  forWorkspace: async function (workspaceId) {
    return await prisma.$queryRawUnsafe(
      "SELECT * FROM workspace_notes WHERE workspaceId = ? ORDER BY pinned DESC, updatedAt DESC",
      workspaceId,
    );
  },

  shareToWorkspace: async function (noteId, targetWorkspaceId, userId = null) {
    await this.ensureSharedTable();
    const id = require("crypto").randomUUID();
    const sharedAt = Math.floor(Date.now() / 1000);
    await prisma.$executeRawUnsafe(
      "INSERT OR IGNORE INTO shared_workspace_notes (id, note_id, target_workspace_id, shared_by, shared_at) VALUES (?, ?, ?, ?, ?)",
      id,
      Number(noteId),
      Number(targetWorkspaceId),
      userId ? Number(userId) : null,
      sharedAt,
    );
    const rows = await prisma.$queryRawUnsafe(
      "SELECT * FROM shared_workspace_notes WHERE note_id = ? AND target_workspace_id = ?",
      Number(noteId),
      Number(targetWorkspaceId),
    );
    return Array.isArray(rows) ? rows[0] : rows;
  },

  unshareFromWorkspace: async function (noteId, targetWorkspaceId) {
    await this.ensureSharedTable();
    await prisma.$executeRawUnsafe(
      "DELETE FROM shared_workspace_notes WHERE note_id = ? AND target_workspace_id = ?",
      Number(noteId),
      Number(targetWorkspaceId),
    );
    return true;
  },

  sharedToWorkspace: async function (workspaceId) {
    await this.ensureSharedTable();
    return await prisma.$queryRawUnsafe(
      `SELECT n.*, s.shared_at, s.shared_by, w.slug AS source_workspace_slug, w.name AS source_workspace_name
       FROM shared_workspace_notes s
       JOIN workspace_notes n ON n.id = s.note_id
       JOIN workspaces w ON w.id = n.workspaceId
       WHERE s.target_workspace_id = ?
       ORDER BY s.shared_at DESC`,
      Number(workspaceId),
    );
  },

  getShareableWorkspaces: async function (currentWorkspaceId, userId = null) {
    // P0 fix: Only return workspaces the user is a member of.
    // Previously this returned ALL workspaces in the instance, leaking
    // names and slugs of workspaces the user has no access to (IDOR).
    if (!userId) {
      // Single-user mode (no auth): return only the current workspace
      // as there is no membership table to query.
      return await prisma.$queryRawUnsafe(
        "SELECT id, name, slug FROM workspaces WHERE id = ? ORDER BY name ASC",
        Number(currentWorkspaceId),
      );
    }
    // Multi-user mode: filter by workspace_users membership
    return await prisma.$queryRawUnsafe(
      `SELECT w.id, w.name, w.slug
       FROM workspaces w
       JOIN workspace_users wu ON wu.workspace_id = w.id
       WHERE wu.user_id = ? AND w.id != ?
       ORDER BY w.name ASC`,
      Number(userId),
      Number(currentWorkspaceId),
    );
  },

  create: async function (workspaceId, content = "", pinned = false) {
    await prisma.$executeRawUnsafe(
      // NOTE: datetime('now') MUST use single quotes. Double-quoted "now" is
      // an identifier in SQLite; better-sqlite3 (the Prisma 7 adapter)
      // rejects it with `no such column: "now"`, breaking note creation.
      "INSERT INTO workspace_notes (workspaceId, content, pinned, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))",
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
        "UPDATE workspace_notes SET content = ?, updatedAt = datetime('now') WHERE id = ?",
        data.content,
        id,
      );
    }
    if (data.pinned !== undefined) {
      await prisma.$executeRawUnsafe(
        "UPDATE workspace_notes SET pinned = ?, updatedAt = datetime('now') WHERE id = ?",
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
