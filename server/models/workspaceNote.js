// SPDX-License-Identifier: MIT
const prisma = require("../utils/prisma");

const SHARED_TABLE_SQL = `CREATE TABLE IF NOT EXISTS shared_workspace_notes (
    id TEXT PRIMARY KEY,
    note_id INTEGER NOT NULL,
    target_workspace_id INTEGER NOT NULL,
    shared_by INTEGER,
    shared_at INTEGER,
    UNIQUE(note_id, target_workspace_id)
)`;

const WorkspaceNote = {
  ensureSharedTable: async function () {
    await prisma.$executeRawUnsafe(SHARED_TABLE_SQL);
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

  getShareableWorkspaces: async function (currentWorkspaceId) {
    return await prisma.$queryRawUnsafe(
      "SELECT id, name, slug FROM workspaces WHERE id != ? ORDER BY name ASC",
      Number(currentWorkspaceId),
    );
  },

  create: async function (workspaceId, content = "", pinned = false) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO workspace_notes (workspaceId, content, pinned, createdAt, updatedAt) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
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
        'UPDATE workspace_notes SET content = ?, updatedAt = datetime("now") WHERE id = ?',
        data.content,
        id,
      );
    }
    if (data.pinned !== undefined) {
      await prisma.$executeRawUnsafe(
        'UPDATE workspace_notes SET pinned = ?, updatedAt = datetime("now") WHERE id = ?',
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
