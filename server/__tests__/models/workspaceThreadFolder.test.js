// SPDX-License-Identifier: MIT
// Tests for core WorkspaceThreadFolder model (Issue #381).
// Covers: where, new, update, delete, assignThread.
// Verifies cross-workspace/cross-user access control on update/delete/assign.

jest.mock("../../utils/prisma", () => {
  const mockFolders = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const mockThreads = {
    update: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
  };
  return {
    workspace_thread_folders: mockFolders,
    workspace_threads: mockThreads,
    $transaction: jest.fn(async (operations) => Promise.all(operations)),
  };
});

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const { WorkspaceThreadFolder } = require("../../models/workspaceThreadFolder");
const prisma = require("../../utils/prisma");

describe("WorkspaceThreadFolder model", () => {
  afterEach(() => jest.clearAllMocks());

  // ── where ───────────────────────────────────────────────────────────
  describe("WorkspaceThreadFolder.where", () => {
    it("lists folders for a workspace", async () => {
      const mockFolders = [
        { id: 1, name: "Folder A", workspace_id: 10 },
        { id: 2, name: "Folder B", workspace_id: 10 },
      ];
      prisma.workspace_thread_folders.findMany.mockResolvedValue(mockFolders);

      const results = await WorkspaceThreadFolder.where({ workspace_id: 10 });

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe("Folder A");
      expect(prisma.workspace_thread_folders.findMany).toHaveBeenCalledWith({
        where: { workspace_id: 10 },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    });

    it("scopes by user_id when provided", async () => {
      prisma.workspace_thread_folders.findMany.mockResolvedValue([]);

      await WorkspaceThreadFolder.where({ workspace_id: 10, user_id: 5 });

      expect(prisma.workspace_thread_folders.findMany).toHaveBeenCalledWith({
        where: { workspace_id: 10, user_id: 5 },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    });

    it("returns an empty array when workspace_id is null", async () => {
      const results = await WorkspaceThreadFolder.where({ workspace_id: null });

      expect(results).toEqual([]);
      expect(prisma.workspace_thread_folders.findMany).not.toHaveBeenCalled();
    });

    it("returns an empty array on prisma error (catch)", async () => {
      prisma.workspace_thread_folders.findMany.mockRejectedValue(
        new Error("DB error"),
      );

      const results = await WorkspaceThreadFolder.where({ workspace_id: 10 });

      expect(results).toEqual([]);
    });
  });

  // ── new ─────────────────────────────────────────────────────────────
  describe("WorkspaceThreadFolder.new", () => {
    it("creates a folder with a valid name", async () => {
      const mockFolder = {
        id: 1,
        name: "My Folder",
        workspace_id: 10,
        user_id: null,
      };
      prisma.workspace_thread_folders.create.mockResolvedValue(mockFolder);

      const { folder, message } = await WorkspaceThreadFolder.new(
        { id: 10 },
        null,
        "My Folder",
      );

      expect(message).toBeNull();
      expect(folder).toEqual(mockFolder);
      expect(prisma.workspace_thread_folders.create).toHaveBeenCalledWith({
        data: {
          name: "My Folder",
          workspace_id: 10,
          user_id: null,
        },
      });
    });

    it("creates a folder with a user_id in multi-user mode", async () => {
      prisma.workspace_thread_folders.create.mockResolvedValue({
        id: 2,
        name: "User Folder",
        workspace_id: 10,
        user_id: 42,
      });

      const { folder, message } = await WorkspaceThreadFolder.new(
        { id: 10 },
        42,
        "User Folder",
      );

      expect(message).toBeNull();
      const createCall = prisma.workspace_thread_folders.create.mock.calls[0][0];
      expect(createCall.data.user_id).toBe(42);
    });

    it("returns error when name is empty/whitespace", async () => {
      const { folder, message } = await WorkspaceThreadFolder.new(
        { id: 10 },
        null,
        "   ",
      );

      expect(folder).toBeNull();
      expect(message).toBe("Name is required.");
      expect(prisma.workspace_thread_folders.create).not.toHaveBeenCalled();
    });

    it("returns error when name is null", async () => {
      const { folder, message } = await WorkspaceThreadFolder.new(
        { id: 10 },
        null,
        null,
      );

      expect(folder).toBeNull();
      expect(message).toBe("Name is required.");
    });

    it("truncates long names to 255 characters", async () => {
      prisma.workspace_thread_folders.create.mockResolvedValue({ id: 3 });

      await WorkspaceThreadFolder.new({ id: 10 }, null, "x".repeat(300));

      const createCall = prisma.workspace_thread_folders.create.mock.calls[0][0];
      expect(createCall.data.name.length).toBe(255);
    });

    it("returns null folder and error on prisma failure", async () => {
      prisma.workspace_thread_folders.create.mockRejectedValue(
        new Error("DB error"),
      );

      const { folder, message } = await WorkspaceThreadFolder.new(
        { id: 10 },
        null,
        "Test",
      );

      expect(folder).toBeNull();
      expect(message).toBe("DB error");
    });
  });

  // ── update ──────────────────────────────────────────────────────────
  describe("WorkspaceThreadFolder.update", () => {
    it("updates the folder name", async () => {
      prisma.workspace_thread_folders.findFirst.mockResolvedValue({ id: 1 });
      prisma.workspace_thread_folders.update.mockResolvedValue({
        id: 1,
        name: "Renamed",
      });

      const { folder, message } = await WorkspaceThreadFolder.update(
        1,
        { name: "Renamed" },
        10,
      );

      expect(message).toBeNull();
      expect(folder.name).toBe("Renamed");
      expect(prisma.workspace_thread_folders.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ name: "Renamed" }),
      });
    });

    it("rejects update when folder does not belong to workspace", async () => {
      prisma.workspace_thread_folders.findFirst.mockResolvedValue(null);

      const { folder, message } = await WorkspaceThreadFolder.update(
        1,
        { name: "Hack" },
        99, // different workspace
      );

      expect(folder).toBeNull();
      expect(message).toBe("Folder not found in this workspace.");
      expect(prisma.workspace_thread_folders.update).not.toHaveBeenCalled();
    });

    it("rejects update when folder belongs to a different user", async () => {
      prisma.workspace_thread_folders.findFirst.mockResolvedValue(null);

      const { folder, message } = await WorkspaceThreadFolder.update(
        1,
        { name: "Hack" },
        10,
        999, // different user
      );

      expect(folder).toBeNull();
      expect(message).toBe("Folder not found in this workspace.");
    });

    it("returns error when no valid fields to update", async () => {
      const { folder, message } = await WorkspaceThreadFolder.update(
        1,
        { invalid_field: "test" },
      );

      expect(folder).toBeNull();
      expect(message).toBe("Nothing to update.");
    });

    it("truncates long name to 255 characters", async () => {
      prisma.workspace_thread_folders.update.mockResolvedValue({ id: 1 });

      await WorkspaceThreadFolder.update(1, { name: "x".repeat(300) });

      const updateCall = prisma.workspace_thread_folders.update.mock.calls[0][0];
      expect(updateCall.data.name.length).toBe(255);
    });
  });

  // ── delete ──────────────────────────────────────────────────────────
  describe("WorkspaceThreadFolder.delete", () => {
    it("deletes the folder and unassigns its threads", async () => {
      prisma.workspace_thread_folders.findFirst.mockResolvedValue({ id: 1 });
      prisma.workspace_thread_folders.delete.mockResolvedValue({ id: 1 });
      prisma.workspace_threads.updateMany.mockResolvedValue({ count: 3 });

      const result = await WorkspaceThreadFolder.delete(1, 10);

      expect(result).toBe(true);
      // Threads are unassigned (folder_id set to null) before folder deletion
      expect(prisma.workspace_threads.updateMany).toHaveBeenCalledWith({
        where: { folder_id: 1 },
        data: { folder_id: null },
      });
      expect(prisma.workspace_thread_folders.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("rejects deletion when folder does not belong to workspace", async () => {
      prisma.workspace_thread_folders.findFirst.mockResolvedValue(null);

      const result = await WorkspaceThreadFolder.delete(1, 99);

      expect(result).toBe(false);
      expect(prisma.workspace_thread_folders.delete).not.toHaveBeenCalled();
    });

    it("returns false on prisma error", async () => {
      prisma.workspace_thread_folders.delete.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await WorkspaceThreadFolder.delete(1);

      expect(result).toBe(false);
    });
  });

  // ── assignThread ────────────────────────────────────────────────────
  describe("WorkspaceThreadFolder.assignThread", () => {
    it("assigns a thread to a folder", async () => {
      prisma.workspace_threads.findFirst.mockResolvedValue({
        workspace_id: 10,
        user_id: 5,
      });
      prisma.workspace_thread_folders.findFirst.mockResolvedValue({
        workspace_id: 10,
        user_id: 5,
      });
      prisma.workspace_threads.update.mockResolvedValue({ id: 1 });

      const result = await WorkspaceThreadFolder.assignThread(1, 5);

      expect(result).toBe(true);
      expect(prisma.workspace_threads.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { folder_id: 5 },
      });
    });

    it("unassigns a thread when folderId is null", async () => {
      prisma.workspace_threads.update.mockResolvedValue({ id: 1 });

      const result = await WorkspaceThreadFolder.assignThread(1, null);

      expect(result).toBe(true);
      expect(prisma.workspace_threads.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { folder_id: null },
      });
      // No workspace/user checks needed for unassign
      expect(prisma.workspace_threads.findFirst).not.toHaveBeenCalled();
    });

    it("rejects assignment when thread and folder are in different workspaces", async () => {
      prisma.workspace_threads.findFirst.mockResolvedValue({
        workspace_id: 10,
        user_id: 5,
      });
      prisma.workspace_thread_folders.findFirst.mockResolvedValue({
        workspace_id: 99, // different workspace
        user_id: 5,
      });

      const result = await WorkspaceThreadFolder.assignThread(1, 5);

      expect(result).toBe(false);
      expect(prisma.workspace_threads.update).not.toHaveBeenCalled();
    });

    it("rejects assignment when thread and folder belong to different users", async () => {
      prisma.workspace_threads.findFirst.mockResolvedValue({
        workspace_id: 10,
        user_id: 5,
      });
      prisma.workspace_thread_folders.findFirst.mockResolvedValue({
        workspace_id: 10,
        user_id: 999, // different user
      });

      const result = await WorkspaceThreadFolder.assignThread(1, 5);

      expect(result).toBe(false);
      expect(prisma.workspace_threads.update).not.toHaveBeenCalled();
    });

    it("returns false when thread does not exist", async () => {
      prisma.workspace_threads.findFirst.mockResolvedValue(null);

      const result = await WorkspaceThreadFolder.assignThread(999, 5);

      expect(result).toBe(false);
    });

    it("returns false when folder does not exist", async () => {
      prisma.workspace_threads.findFirst.mockResolvedValue({
        workspace_id: 10,
        user_id: 5,
      });
      prisma.workspace_thread_folders.findFirst.mockResolvedValue(null);

      const result = await WorkspaceThreadFolder.assignThread(1, 999);

      expect(result).toBe(false);
    });
  });
});
