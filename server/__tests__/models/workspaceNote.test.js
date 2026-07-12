// SPDX-License-Identifier: MIT
// Tests for the WorkspaceNote model (Issue #529).
// Covers: ensureSharedTable (no-op), get, forWorkspace, create, update,
// delete, shareToWorkspace, unshareFromWorkspace, sharedToWorkspace,
// and getShareableWorkspaces (single-user and multi-user modes).

const mockPrisma = {
  workspace_notes: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  shared_workspace_notes: {
    create: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  workspaces: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock("../../utils/prisma", () => mockPrisma);

const { WorkspaceNote } = require("../../models/workspaceNote");

describe("WorkspaceNote model", () => {
  afterEach(() => jest.clearAllMocks());

  // ── ensureSharedTable ──────────────────────────────────────────────
  describe("ensureSharedTable", () => {
    it("is a no-op (table managed by Prisma migrations)", async () => {
      await expect(WorkspaceNote.ensureSharedTable()).resolves.toBeUndefined();
    });
  });

  // ── get ────────────────────────────────────────────────────────────
  describe("get", () => {
    it("returns a note by id", async () => {
      const fakeNote = { id: 1, workspaceId: 10, content: "hello" };
      mockPrisma.workspace_notes.findFirst.mockResolvedValue(fakeNote);

      const result = await WorkspaceNote.get(1);

      expect(result).toEqual(fakeNote);
      expect(mockPrisma.workspace_notes.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("returns null when note not found", async () => {
      mockPrisma.workspace_notes.findFirst.mockResolvedValue(null);

      const result = await WorkspaceNote.get(999);

      expect(result).toBeNull();
    });
  });

  // ── forWorkspace ───────────────────────────────────────────────────
  describe("forWorkspace", () => {
    it("returns notes for a workspace ordered by pinned and updatedAt", async () => {
      const fakeNotes = [
        { id: 2, workspaceId: 10, pinned: 1 },
        { id: 1, workspaceId: 10, pinned: 0 },
      ];
      mockPrisma.workspace_notes.findMany.mockResolvedValue(fakeNotes);

      const result = await WorkspaceNote.forWorkspace(10);

      expect(result).toEqual(fakeNotes);
      expect(mockPrisma.workspace_notes.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 10, deletedAt: null },
        orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      });
    });

    it("returns trashed notes when trash=true", async () => {
      const fakeNotes = [{ id: 3, workspaceId: 10, deletedAt: "2026-01-01" }];
      mockPrisma.workspace_notes.findMany.mockResolvedValue(fakeNotes);

      const result = await WorkspaceNote.forWorkspace(10, { trash: true });

      expect(result).toEqual(fakeNotes);
      expect(mockPrisma.workspace_notes.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 10, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      });
    });
  });

  // ── create ─────────────────────────────────────────────────────────
  describe("create", () => {
    it("creates a note and returns it", async () => {
      const fakeNote = { id: 1, workspaceId: 10, content: "test", pinned: 0 };
      mockPrisma.workspace_notes.create.mockResolvedValue(fakeNote);

      const result = await WorkspaceNote.create(10, "test", false);

      expect(result).toEqual(fakeNote);
      expect(mockPrisma.workspace_notes.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 10,
          title: "",
          content: "test",
          plainText: "",
          tags: "[]",
          folder: null,
          pinned: 0,
        },
      });
    });

    it("sets pinned to 1 when pinned is true", async () => {
      mockPrisma.workspace_notes.create.mockResolvedValue({ id: 1, pinned: 1 });

      await WorkspaceNote.create(10, "pinned note", true);

      expect(mockPrisma.workspace_notes.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ pinned: 1 }) }),
      );
    });

    it("defaults content to empty string and pinned to false", async () => {
      mockPrisma.workspace_notes.create.mockResolvedValue({ id: 1 });

      await WorkspaceNote.create(10);

      expect(mockPrisma.workspace_notes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ content: "", pinned: 0 }),
        }),
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────
  describe("update", () => {
    it("updates content and returns the updated note", async () => {
      mockPrisma.workspace_notes.update.mockResolvedValue({ id: 1, content: "new" });

      const result = await WorkspaceNote.update(1, { content: "new" });

      expect(result.content).toBe("new");
      expect(mockPrisma.workspace_notes.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ content: "new" }),
      });
    });

    it("updates pinned and returns the updated note", async () => {
      mockPrisma.workspace_notes.update.mockResolvedValue({ id: 1, pinned: 1 });

      const result = await WorkspaceNote.update(1, { pinned: true });

      expect(result.pinned).toBe(1);
      expect(mockPrisma.workspace_notes.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ pinned: 1 }),
      });
    });

    it("updates both content and pinned", async () => {
      mockPrisma.workspace_notes.update.mockResolvedValue({ id: 1, content: "x", pinned: 1 });

      await WorkspaceNote.update(1, { content: "x", pinned: true });

      expect(mockPrisma.workspace_notes.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.workspace_notes.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ content: "x", pinned: 1 }),
      });
    });

    it("sets pinned to 0 when pinned is false", async () => {
      mockPrisma.workspace_notes.update.mockResolvedValue({ id: 1, pinned: 0 });

      await WorkspaceNote.update(1, { pinned: false });

      expect(mockPrisma.workspace_notes.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ pinned: 0 }),
      });
    });
  });

  // ── delete ─────────────────────────────────────────────────────────
  describe("delete", () => {
    it("deletes a note by id and returns true", async () => {
      mockPrisma.workspace_notes.delete.mockResolvedValue({});

      const result = await WorkspaceNote.delete(1);

      expect(result).toBe(true);
      expect(mockPrisma.workspace_notes.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  // ── trash / restore ────────────────────────────────────────────────
  describe("trash", () => {
    it("sets deletedAt and returns true", async () => {
      mockPrisma.workspace_notes.update.mockResolvedValue({});

      const result = await WorkspaceNote.trash(1);

      expect(result).toBe(true);
      expect(mockPrisma.workspace_notes.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      });
    });
  });

  describe("restore", () => {
    it("clears deletedAt and returns true", async () => {
      mockPrisma.workspace_notes.update.mockResolvedValue({});

      const result = await WorkspaceNote.restore(1);

      expect(result).toBe(true);
      expect(mockPrisma.workspace_notes.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ deletedAt: null }),
      });
    });
  });

  // ── shareToWorkspace ───────────────────────────────────────────────
  describe("shareToWorkspace", () => {
    it("inserts a shared note record and returns it", async () => {
      const fakeShare = { id: "share-1", note_id: 5, target_workspace_id: 10 };
      mockPrisma.shared_workspace_notes.create.mockResolvedValue(fakeShare);
      mockPrisma.shared_workspace_notes.findFirst.mockResolvedValue(fakeShare);

      const result = await WorkspaceNote.shareToWorkspace(5, 10, 3);

      expect(result.note_id).toBe(5);
      expect(mockPrisma.shared_workspace_notes.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          note_id: 5,
          target_workspace_id: 10,
          shared_by: 3,
        }),
      });
    });

    it("passes null for shared_by when no userId", async () => {
      const fakeShare = { note_id: 5, target_workspace_id: 10 };
      mockPrisma.shared_workspace_notes.create.mockResolvedValue(fakeShare);
      mockPrisma.shared_workspace_notes.findFirst.mockResolvedValue(fakeShare);

      await WorkspaceNote.shareToWorkspace(5, 10);

      expect(mockPrisma.shared_workspace_notes.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ shared_by: null }),
      });
    });
  });

  // ── unshareFromWorkspace ───────────────────────────────────────────
  describe("unshareFromWorkspace", () => {
    it("deletes the shared note record and returns true", async () => {
      mockPrisma.shared_workspace_notes.deleteMany.mockResolvedValue({ count: 1 });

      const result = await WorkspaceNote.unshareFromWorkspace(5, 10);

      expect(result).toBe(true);
      expect(mockPrisma.shared_workspace_notes.deleteMany).toHaveBeenCalledWith({
        where: { note_id: 5, target_workspace_id: 10 },
      });
    });
  });

  // ── sharedToWorkspace ──────────────────────────────────────────────
  describe("sharedToWorkspace", () => {
    it("returns shared notes with source workspace info", async () => {
      const fakeShare = { id: "s1", note_id: 5, target_workspace_id: 10, shared_at: 123, shared_by: 3 };
      const fakeNote = { id: 5, content: "shared note", workspaceId: 7, deletedAt: null };
      const fakeWs = { id: 7, name: "Source WS", slug: "source-ws" };

      mockPrisma.shared_workspace_notes.findMany.mockResolvedValue([fakeShare]);
      mockPrisma.workspace_notes.findFirst.mockResolvedValue(fakeNote);
      mockPrisma.workspaces.findFirst.mockResolvedValue(fakeWs);

      const result = await WorkspaceNote.sharedToWorkspace(10);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("shared note");
      expect(result[0].source_workspace_name).toBe("Source WS");
      expect(result[0].source_workspace_slug).toBe("source-ws");
    });

    it("skips deleted notes", async () => {
      const fakeShare = { id: "s1", note_id: 5, target_workspace_id: 10 };
      mockPrisma.shared_workspace_notes.findMany.mockResolvedValue([fakeShare]);
      mockPrisma.workspace_notes.findFirst.mockResolvedValue(null);

      const result = await WorkspaceNote.sharedToWorkspace(10);

      expect(result).toEqual([]);
    });
  });

  // ── getShareableWorkspaces ─────────────────────────────────────────
  describe("getShareableWorkspaces", () => {
    it("returns only current workspace in single-user mode (no userId)", async () => {
      const fakeWorkspaces = [{ id: 10, name: "Current", slug: "current" }];
      mockPrisma.workspaces.findMany.mockResolvedValue(fakeWorkspaces);

      const result = await WorkspaceNote.getShareableWorkspaces(10);

      expect(result).toEqual(fakeWorkspaces);
      expect(mockPrisma.workspaces.findMany).toHaveBeenCalledWith({
        where: { id: 10 },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      });
    });

    it("returns user-member workspaces (excluding current) in multi-user mode", async () => {
      const fakeWorkspaces = [{ id: 20, name: "Other WS", slug: "other-ws" }];
      mockPrisma.workspaces.findMany.mockResolvedValue(fakeWorkspaces);

      const result = await WorkspaceNote.getShareableWorkspaces(10, 5);

      expect(result).toEqual(fakeWorkspaces);
      expect(mockPrisma.workspaces.findMany).toHaveBeenCalledWith({
        where: {
          workspace_users: { some: { user_id: 5 } },
          id: { not: 10 },
        },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      });
    });
  });
});
