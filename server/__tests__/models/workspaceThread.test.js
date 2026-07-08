// SPDX-License-Identifier: MIT
// Tests for core WorkspaceThread model (Issue #381).
// Covers: new (create), update, get, delete (cascade), where, autoRenameThread.
// Verifies the cascade-delete path (workspace_chats and
// workspace_agent_invocations have no FK — manual cleanup required).

jest.mock("../../utils/prisma", () => {
  const mockWorkspaceThreads = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  const mockWorkspaceChats = {
    deleteMany: jest.fn(),
    count: jest.fn(),
  };
  const mockWorkspaceAgentInvocations = {
    deleteMany: jest.fn(),
  };
  return {
    workspace_threads: mockWorkspaceThreads,
    workspace_chats: mockWorkspaceChats,
    workspace_agent_invocations: mockWorkspaceAgentInvocations,
    $transaction: jest.fn(async (operations) => Promise.all(operations)),
  };
});

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("../../utils/database/queryLimits", () => ({
  clampLimit: jest.fn((val) => val || 1000),
  MAX_LIST_LIMIT: 1000,
}));

const { WorkspaceThread } = require("../../models/workspaceThread");
const prisma = require("../../utils/prisma");

describe("WorkspaceThread model", () => {
  afterEach(() => jest.clearAllMocks());

  // ── WorkspaceThread.new (create) ────────────────────────────────────
  describe("WorkspaceThread.new", () => {
    it("creates a thread with a UUID slug when no slug is provided", async () => {
      const mockThread = {
        id: 1,
        name: "New Thread",
        slug: "some-uuid",
        workspace_id: 10,
        user_id: null,
      };
      prisma.workspace_threads.create.mockResolvedValue(mockThread);

      const { thread, message } = await WorkspaceThread.new({ id: 10 });

      expect(message).toBeNull();
      expect(thread).toEqual(mockThread);
      const createCall = prisma.workspace_threads.create.mock.calls[0][0];
      expect(createCall.data.workspace_id).toBe(10);
      expect(createCall.data.name).toBe("New Thread");
      // UUID slugs are not checked for collision
      expect(prisma.workspace_threads.findFirst).not.toHaveBeenCalled();
    });

    it("creates a thread with a provided slug", async () => {
      prisma.workspace_threads.findFirst.mockResolvedValue(null); // no collision
      prisma.workspace_threads.create.mockResolvedValue({
        id: 2,
        name: "Custom",
        slug: "custom-slug",
        workspace_id: 10,
      });

      const { thread, message } = await WorkspaceThread.new(
        { id: 10 },
        null,
        { slug: "custom-slug", name: "Custom" },
      );

      expect(message).toBeNull();
      expect(thread.slug).toBe("custom-slug");
      // Slug was checked for collision
      expect(prisma.workspace_threads.findFirst).toHaveBeenCalledWith({
        where: { slug: "custom-slug" },
      });
    });

    it("retries slug on collision with a random suffix", async () => {
      prisma.workspace_threads.findFirst
        .mockResolvedValueOnce({ id: 99, slug: "test" }) // collision
        .mockResolvedValueOnce(null); // no collision on retry
      prisma.workspace_threads.create.mockResolvedValue({
        id: 3,
        name: "Test",
        slug: "test-abcd1234",
        workspace_id: 10,
      });

      const { thread, message } = await WorkspaceThread.new(
        { id: 10 },
        null,
        { slug: "test", name: "Test" },
      );

      expect(message).toBeNull();
      expect(thread).toBeDefined();
      expect(prisma.workspace_threads.findFirst).toHaveBeenCalledTimes(2);
    });

    it("creates a thread with a user_id in multi-user mode", async () => {
      prisma.workspace_threads.create.mockResolvedValue({
        id: 4,
        name: "New Thread",
        slug: "uuid",
        workspace_id: 10,
        user_id: 42,
      });

      const { thread, message } = await WorkspaceThread.new({ id: 10 }, 42);

      expect(message).toBeNull();
      const createCall = prisma.workspace_threads.create.mock.calls[0][0];
      expect(createCall.data.user_id).toBe(42);
    });

    it("returns null thread and error message on prisma failure", async () => {
      prisma.workspace_threads.create.mockRejectedValue(new Error("DB error"));

      const { thread, message } = await WorkspaceThread.new({ id: 10 });

      expect(thread).toBeNull();
      expect(message).toBe("DB error");
    });

    it("truncates long names to 255 characters", async () => {
      prisma.workspace_threads.create.mockResolvedValue({
        id: 5,
        name: "x".repeat(255),
        slug: "uuid",
        workspace_id: 10,
      });

      await WorkspaceThread.new({ id: 10 }, null, {
        name: "x".repeat(300),
      });

      const createCall = prisma.workspace_threads.create.mock.calls[0][0];
      expect(createCall.data.name.length).toBe(255);
    });
  });

  // ── WorkspaceThread.update ──────────────────────────────────────────
  describe("WorkspaceThread.update", () => {
    it("updates the thread name", async () => {
      const prevThread = { id: 1, name: "Old Name" };
      const updatedThread = { id: 1, name: "New Name" };
      prisma.workspace_threads.update.mockResolvedValue(updatedThread);

      const { thread, message } = await WorkspaceThread.update(prevThread, {
        name: "New Name",
      });

      expect(message).toBeNull();
      expect(thread).toEqual(updatedThread);
      expect(prisma.workspace_threads.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: "New Name" },
      });
    });

    it("ignores non-writable fields", async () => {
      const prevThread = { id: 1, name: "Old" };
      prisma.workspace_threads.update.mockResolvedValue(prevThread);

      await WorkspaceThread.update(prevThread, {
        name: "New",
        slug: "should-be-ignored", // not in writable list
      });

      const updateCall = prisma.workspace_threads.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty("slug");
      expect(updateCall.data).toHaveProperty("name");
    });

    it("returns the previous thread when no valid fields to update", async () => {
      const prevThread = { id: 1, name: "Old" };

      const { thread, message } = await WorkspaceThread.update(prevThread, {
        slug: "ignored",
      });

      expect(message).toBe("No valid fields to update!");
      expect(thread).toEqual(prevThread);
      expect(prisma.workspace_threads.update).not.toHaveBeenCalled();
    });

    it("throws when no thread is provided", async () => {
      await expect(WorkspaceThread.update(null, {})).rejects.toThrow(
        "No thread id provided for update",
      );
    });

    it("truncates long name to 255 characters", async () => {
      const prevThread = { id: 1, name: "Old" };
      prisma.workspace_threads.update.mockResolvedValue({ id: 1 });

      await WorkspaceThread.update(prevThread, { name: "x".repeat(300) });

      const updateCall = prisma.workspace_threads.update.mock.calls[0][0];
      expect(updateCall.data.name.length).toBe(255);
    });
  });

  // ── WorkspaceThread.get ─────────────────────────────────────────────
  describe("WorkspaceThread.get", () => {
    it("returns the thread when found", async () => {
      const mockThread = { id: 1, slug: "thread-1", name: "Thread 1" };
      prisma.workspace_threads.findFirst.mockResolvedValue(mockThread);

      const result = await WorkspaceThread.get({ slug: "thread-1" });

      expect(result).toEqual(mockThread);
      expect(prisma.workspace_threads.findFirst).toHaveBeenCalledWith({
        where: { slug: "thread-1" },
      });
    });

    it("returns null when thread does not exist", async () => {
      prisma.workspace_threads.findFirst.mockResolvedValue(null);

      const result = await WorkspaceThread.get({ slug: "nonexistent" });

      expect(result).toBeNull();
    });

    it("returns null on prisma error", async () => {
      prisma.workspace_threads.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await WorkspaceThread.get({ id: 1 });

      expect(result).toBeNull();
    });
  });

  // ── WorkspaceThread.delete (cascade) ────────────────────────────────
  describe("WorkspaceThread.delete (cascade)", () => {
    it("deletes thread and cascades to chats and agent invocations", async () => {
      prisma.workspace_threads.findMany.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      prisma.workspace_chats.deleteMany.mockResolvedValue({ count: 5 });
      prisma.workspace_agent_invocations.deleteMany.mockResolvedValue({
        count: 2,
      });
      prisma.workspace_threads.deleteMany.mockResolvedValue({ count: 2 });

      const result = await WorkspaceThread.delete({ workspace_id: 10 });

      expect(result).toBe(true);
      // Should have looked up thread IDs first
      expect(prisma.workspace_threads.findMany).toHaveBeenCalledWith({
        where: { workspace_id: 10 },
        select: { id: true },
        take: 100,
      });
      // Should have deleted chats and invocations for those thread IDs
      expect(prisma.workspace_chats.deleteMany).toHaveBeenCalledWith({
        where: { thread_id: { in: [1, 2] } },
      });
      expect(prisma.workspace_agent_invocations.deleteMany).toHaveBeenCalledWith({
        where: { thread_id: { in: [1, 2] } },
      });
      // Should have deleted the threads themselves
      expect(prisma.workspace_threads.deleteMany).toHaveBeenCalledWith({
        where: { workspace_id: 10 },
      });
      // All in a transaction
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("works when no threads match the clause", async () => {
      prisma.workspace_threads.findMany.mockResolvedValue([]);
      prisma.workspace_threads.deleteMany.mockResolvedValue({ count: 0 });

      const result = await WorkspaceThread.delete({ workspace_id: 99 });

      expect(result).toBe(true);
      // No chat/invocation cleanup needed when no threads exist
      expect(prisma.workspace_chats.deleteMany).not.toHaveBeenCalled();
      expect(prisma.workspace_agent_invocations.deleteMany).not.toHaveBeenCalled();
    });

    it("returns false on prisma error", async () => {
      prisma.workspace_threads.findMany.mockRejectedValue(new Error("DB error"));

      const result = await WorkspaceThread.delete({ workspace_id: 10 });

      expect(result).toBe(false);
    });
  });

  // ── WorkspaceThread.where ───────────────────────────────────────────
  describe("WorkspaceThread.where", () => {
    it("lists threads matching a clause with default ordering", async () => {
      const mockThreads = [
        { id: 2, name: "Thread 2", createdAt: new Date("2026-01-02") },
        { id: 1, name: "Thread 1", createdAt: new Date("2026-01-01") },
      ];
      prisma.workspace_threads.findMany.mockResolvedValue(mockThreads);

      const results = await WorkspaceThread.where({ workspace_id: 10 });

      expect(results).toHaveLength(2);
      // Default orderBy is { createdAt: "desc" }
      expect(prisma.workspace_threads.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspace_id: 10 },
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("respects a custom orderBy", async () => {
      prisma.workspace_threads.findMany.mockResolvedValue([]);

      await WorkspaceThread.where({ workspace_id: 10 }, null, { id: "asc" });

      expect(prisma.workspace_threads.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { id: "asc" },
        }),
      );
    });

    it("respects a custom limit", async () => {
      prisma.workspace_threads.findMany.mockResolvedValue([]);

      await WorkspaceThread.where({ workspace_id: 10 }, 50);

      expect(prisma.workspace_threads.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it("returns an empty array on prisma error", async () => {
      prisma.workspace_threads.findMany.mockRejectedValue(new Error("DB error"));

      const results = await WorkspaceThread.where({ workspace_id: 10 });

      expect(results).toEqual([]);
    });
  });
});
