// SPDX-License-Identifier: MIT
// Tests for the WorkspaceNote model (Issue #529).
// Covers: ensureSharedTable (no-op), get, forWorkspace, create, update,
// delete, shareToWorkspace, unshareFromWorkspace, sharedToWorkspace,
// and getShareableWorkspaces (single-user and multi-user modes).

jest.mock("../../utils/prisma", () => {
  const mockQueryRawUnsafe = jest.fn();
  const mockExecuteRawUnsafe = jest.fn();
  return {
    $queryRawUnsafe: mockQueryRawUnsafe,
    $executeRawUnsafe: mockExecuteRawUnsafe,
  };
});

jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-uuid-1234"),
}));

const { WorkspaceNote } = require("../../models/workspaceNote");
const prisma = require("../../utils/prisma");

describe("WorkspaceNote model", () => {
  afterEach(() => jest.clearAllMocks());

  // ── ensureSharedTable ──────────────────────────────────────────────
  describe("ensureSharedTable", () => {
    it("is a no-op (table managed by Prisma migrations)", async () => {
      await expect(WorkspaceNote.ensureSharedTable()).resolves.toBeUndefined();
      expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  // ── get ────────────────────────────────────────────────────────────
  describe("get", () => {
    it("returns a note by id", async () => {
      const fakeNote = { id: 1, workspaceId: 10, content: "hello" };
      prisma.$queryRawUnsafe.mockResolvedValue([fakeNote]);

      const result = await WorkspaceNote.get(1);

      expect(result).toEqual(fakeNote);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        "SELECT * FROM workspace_notes WHERE id = ? LIMIT 1",
        1,
      );
    });

    it("returns the row directly when not an array", async () => {
      const fakeNote = { id: 1, content: "hello" };
      prisma.$queryRawUnsafe.mockResolvedValue(fakeNote);

      const result = await WorkspaceNote.get(1);

      expect(result).toEqual(fakeNote);
    });
  });

  // ── forWorkspace ───────────────────────────────────────────────────
  describe("forWorkspace", () => {
    it("returns notes for a workspace ordered by pinned and updatedAt", async () => {
      const fakeNotes = [
        { id: 2, workspaceId: 10, pinned: 1 },
        { id: 1, workspaceId: 10, pinned: 0 },
      ];
      prisma.$queryRawUnsafe.mockResolvedValue(fakeNotes);

      const result = await WorkspaceNote.forWorkspace(10);

      expect(result).toEqual(fakeNotes);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        "SELECT * FROM workspace_notes WHERE workspaceId = ? ORDER BY pinned DESC, updatedAt DESC",
        10,
      );
    });
  });

  // ── create ─────────────────────────────────────────────────────────
  describe("create", () => {
    it("creates a note and returns it", async () => {
      const fakeNote = { id: 1, workspaceId: 10, content: "test", pinned: 0 };
      prisma.$executeRawUnsafe.mockResolvedValue({});
      prisma.$queryRawUnsafe.mockResolvedValue([fakeNote]);

      const result = await WorkspaceNote.create(10, "test", false);

      expect(result).toEqual(fakeNote);
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        "INSERT INTO workspace_notes (workspaceId, content, pinned, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))",
        10,
        "test",
        0,
      );
    });

    it("sets pinned to 1 when pinned is true", async () => {
      prisma.$executeRawUnsafe.mockResolvedValue({});
      prisma.$queryRawUnsafe.mockResolvedValue([{ id: 1, pinned: 1 }]);

      await WorkspaceNote.create(10, "pinned note", true);

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        10,
        "pinned note",
        1,
      );
    });

    it("defaults content to empty string and pinned to false", async () => {
      prisma.$executeRawUnsafe.mockResolvedValue({});
      prisma.$queryRawUnsafe.mockResolvedValue([{ id: 1 }]);

      await WorkspaceNote.create(10);

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        10,
        "",
        0,
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────
  describe("update", () => {
    it("updates content and returns the updated note", async () => {
      prisma.$executeRawUnsafe.mockResolvedValue({});
      prisma.$queryRawUnsafe.mockResolvedValue([{ id: 1, content: "new" }]);

      const result = await WorkspaceNote.update(1, { content: "new" });

      expect(result.content).toBe("new");
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        "UPDATE workspace_notes SET content = ?, updatedAt = datetime('now') WHERE id = ?",
        "new",
        1,
      );
    });

    it("updates pinned and returns the updated note", async () => {
      prisma.$executeRawUnsafe.mockResolvedValue({});
      prisma.$queryRawUnsafe.mockResolvedValue([{ id: 1, pinned: 1 }]);

      const result = await WorkspaceNote.update(1, { pinned: true });

      expect(result.pinned).toBe(1);
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        "UPDATE workspace_notes SET pinned = ?, updatedAt = datetime('now') WHERE id = ?",
        1,
        1,
      );
    });

    it("updates both content and pinned", async () => {
      prisma.$executeRawUnsafe.mockResolvedValue({});
      prisma.$queryRawUnsafe.mockResolvedValue([{ id: 1, content: "x", pinned: 1 }]);

      await WorkspaceNote.update(1, { content: "x", pinned: true });

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);
    });

    it("sets pinned to 0 when pinned is false", async () => {
      prisma.$executeRawUnsafe.mockResolvedValue({});
      prisma.$queryRawUnsafe.mockResolvedValue([{ id: 1, pinned: 0 }]);

      await WorkspaceNote.update(1, { pinned: false });

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        0,
        1,
      );
    });
  });

  // ── delete ─────────────────────────────────────────────────────────
  describe("delete", () => {
    it("deletes a note by id and returns true", async () => {
      prisma.$executeRawUnsafe.mockResolvedValue({});

      const result = await WorkspaceNote.delete(1);

      expect(result).toBe(true);
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        "DELETE FROM workspace_notes WHERE id = ?",
        1,
      );
    });
  });

  // ── shareToWorkspace ───────────────────────────────────────────────
  describe("shareToWorkspace", () => {
    it("inserts a shared note record and returns it", async () => {
      prisma.$executeRawUnsafe.mockResolvedValue({});
      prisma.$queryRawUnsafe.mockResolvedValue([
        { id: "share-1", note_id: 5, target_workspace_id: 10 },
      ]);

      const result = await WorkspaceNote.shareToWorkspace(5, 10, 3);

      expect(result.note_id).toBe(5);
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        "INSERT OR IGNORE INTO shared_workspace_notes (id, note_id, target_workspace_id, shared_by, shared_at) VALUES (?, ?, ?, ?, ?)",
        expect.any(String), // random UUID
        5,
        10,
        3,
        expect.any(Number), // timestamp
      );
    });

    it("passes null for shared_by when no userId", async () => {
      prisma.$executeRawUnsafe.mockResolvedValue({});
      prisma.$queryRawUnsafe.mockResolvedValue([
        { note_id: 5, target_workspace_id: 10 },
      ]);

      await WorkspaceNote.shareToWorkspace(5, 10);

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        5,
        10,
        null,
        expect.any(Number),
      );
    });
  });

  // ── unshareFromWorkspace ───────────────────────────────────────────
  describe("unshareFromWorkspace", () => {
    it("deletes the shared note record and returns true", async () => {
      prisma.$executeRawUnsafe.mockResolvedValue({});

      const result = await WorkspaceNote.unshareFromWorkspace(5, 10);

      expect(result).toBe(true);
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        "DELETE FROM shared_workspace_notes WHERE note_id = ? AND target_workspace_id = ?",
        5,
        10,
      );
    });
  });

  // ── sharedToWorkspace ──────────────────────────────────────────────
  describe("sharedToWorkspace", () => {
    it("returns shared notes with source workspace info", async () => {
      const fakeShared = [
        {
          id: 1,
          content: "shared note",
          shared_at: 1234567890,
          source_workspace_name: "Source WS",
          source_workspace_slug: "source-ws",
        },
      ];
      prisma.$queryRawUnsafe.mockResolvedValue(fakeShared);

      const result = await WorkspaceNote.sharedToWorkspace(10);

      expect(result).toEqual(fakeShared);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("FROM shared_workspace_notes s"),
        10,
      );
    });
  });

  // ── getShareableWorkspaces ─────────────────────────────────────────
  describe("getShareableWorkspaces", () => {
    it("returns only current workspace in single-user mode (no userId)", async () => {
      const fakeWorkspaces = [{ id: 10, name: "Current", slug: "current" }];
      prisma.$queryRawUnsafe.mockResolvedValue(fakeWorkspaces);

      const result = await WorkspaceNote.getShareableWorkspaces(10);

      expect(result).toEqual(fakeWorkspaces);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        "SELECT id, name, slug FROM workspaces WHERE id = ? ORDER BY name ASC",
        10,
      );
    });

    it("returns user-member workspaces (excluding current) in multi-user mode", async () => {
      const fakeWorkspaces = [
        { id: 20, name: "Other WS", slug: "other-ws" },
      ];
      prisma.$queryRawUnsafe.mockResolvedValue(fakeWorkspaces);

      const result = await WorkspaceNote.getShareableWorkspaces(10, 5);

      expect(result).toEqual(fakeWorkspaces);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("JOIN workspace_users wu"),
        5,
        10,
      );
    });
  });
});
