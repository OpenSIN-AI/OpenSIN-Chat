// SPDX-License-Identifier: MIT
// Tests for the Memory model (Issue #529).
// Covers: forUserWorkspace, globalForUser, create (with limit enforcement),
// update (with ownership check), delete (with ownership filter),
// promoteToGlobal, demoteToWorkspace, updateLastUsed, countForScope,
// replaceWorkspaceMemories, applyExtractedMemories, migrateToMultiUser, get.

jest.mock("../../utils/prisma", () => {
  const mockMemories = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  };
  return {
    memories: mockMemories,
    $transaction: jest.fn(async (fn) => fn({ memories: mockMemories })),
  };
});

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const { Memory } = require("../../models/memory");
const prisma = require("../../utils/prisma");

describe("Memory model", () => {
  afterEach(() => jest.clearAllMocks());

  // ── constants ──────────────────────────────────────────────────────
  describe("constants", () => {
    it("exposes scope limits and valid scopes", () => {
      expect(Memory.GLOBAL_LIMIT).toBe(5);
      expect(Memory.WORKSPACE_LIMIT).toBe(20);
      expect(Memory.MAX_INJECTED_WORKSPACE_LIMIT).toBe(5);
      expect(Memory.VALID_SCOPES).toEqual(["workspace", "global"]);
    });
  });

  // ── validations ────────────────────────────────────────────────────
  describe("validations", () => {
    it("validates id as integer", () => {
      expect(Memory.validations.id(42)).toBe(42);
      expect(() => Memory.validations.id("abc")).toThrow();
      expect(() => Memory.validations.id(3.14)).toThrow();
    });

    it("validates userId (null allowed)", () => {
      expect(Memory.validations.userId(null)).toBeNull();
      expect(Memory.validations.userId(undefined)).toBeNull();
      expect(Memory.validations.userId(5)).toBe(5);
    });

    it("validates workspaceId (null allowed)", () => {
      expect(Memory.validations.workspaceId(null)).toBeNull();
      expect(Memory.validations.workspaceId(10)).toBe(10);
    });

    it("validates scope", () => {
      expect(Memory.validations.scope("workspace")).toBe("workspace");
      expect(Memory.validations.scope("global")).toBe("global");
      expect(() => Memory.validations.scope("invalid")).toThrow();
    });

    it("validates content (non-empty, trimmed, capped at 10000)", () => {
      expect(Memory.validations.content("  hello  ")).toBe("hello");
      expect(() => Memory.validations.content("")).toThrow();
      expect(() => Memory.validations.content("   ")).toThrow();
      expect(() => Memory.validations.content(123)).toThrow();
      const long = "x".repeat(12000);
      expect(Memory.validations.content(long).length).toBe(10000);
    });
  });

  // ── forUserWorkspace ───────────────────────────────────────────────
  describe("forUserWorkspace", () => {
    it("returns workspace-scoped memories for a user", async () => {
      const fakeMemories = [
        { id: 1, userId: 5, workspaceId: 10, scope: "workspace", content: "a" },
      ];
      prisma.memories.findMany.mockResolvedValue(fakeMemories);

      const result = await Memory.forUserWorkspace(5, 10);

      expect(result).toEqual(fakeMemories);
      expect(prisma.memories.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 5, workspaceId: 10, scope: "workspace" },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      );
    });

    it("returns [] on error", async () => {
      prisma.memories.findMany.mockRejectedValue(new Error("DB error"));
      const result = await Memory.forUserWorkspace(5, 10);
      expect(result).toEqual([]);
    });
  });

  // ── globalForUser ──────────────────────────────────────────────────
  describe("globalForUser", () => {
    it("returns global-scoped memories for a user", async () => {
      const fakeMemories = [
        { id: 1, userId: 5, scope: "global", content: "g1" },
      ];
      prisma.memories.findMany.mockResolvedValue(fakeMemories);

      const result = await Memory.globalForUser(5);

      expect(result).toEqual(fakeMemories);
      expect(prisma.memories.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 5, scope: "global" },
          take: 5,
        }),
      );
    });

    it("returns [] on error", async () => {
      prisma.memories.findMany.mockRejectedValue(new Error("DB error"));
      const result = await Memory.globalForUser(5);
      expect(result).toEqual([]);
    });
  });

  // ── create ─────────────────────────────────────────────────────────
  describe("create", () => {
    it("creates a workspace memory when under limit", async () => {
      prisma.memories.count.mockResolvedValue(0);
      prisma.memories.create.mockResolvedValue({
        id: 1,
        userId: 5,
        workspaceId: 10,
        scope: "workspace",
        content: "test memory",
      });

      const { memory, message } = await Memory.create({
        userId: 5,
        workspaceId: 10,
        scope: "workspace",
        content: "test memory",
      });

      expect(message).toBeNull();
      expect(memory).toBeDefined();
      expect(memory.id).toBe(1);
      expect(prisma.memories.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 5,
            workspaceId: 10,
            scope: "workspace",
            content: "test memory",
          }),
        }),
      );
    });

    it("creates a global memory when under limit", async () => {
      prisma.memories.count.mockResolvedValue(2);
      prisma.memories.create.mockResolvedValue({
        id: 2,
        userId: 5,
        workspaceId: null,
        scope: "global",
        content: "global mem",
      });

      const { memory, message } = await Memory.create({
        userId: 5,
        scope: "global",
        content: "global mem",
      });

      expect(message).toBeNull();
      expect(memory.id).toBe(2);
      expect(prisma.memories.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: null,
            scope: "global",
          }),
        }),
      );
    });

    it("returns error when workspace scope has no workspaceId", async () => {
      const { memory, message } = await Memory.create({
        userId: 5,
        scope: "workspace",
        content: "test",
      });
      expect(memory).toBeNull();
      expect(message).toContain("workspaceId is required");
    });

    it("returns error when workspace limit reached", async () => {
      prisma.memories.count.mockResolvedValue(20);

      const { memory, message } = await Memory.create({
        userId: 5,
        workspaceId: 10,
        scope: "workspace",
        content: "test",
      });

      expect(memory).toBeNull();
      expect(message).toContain("Maximum workspace memory limit");
    });

    it("returns error when global limit reached", async () => {
      prisma.memories.count.mockResolvedValue(5);

      const { memory, message } = await Memory.create({
        userId: 5,
        scope: "global",
        content: "test",
      });

      expect(memory).toBeNull();
      expect(message).toContain("Maximum global memory limit");
    });

    it("returns error on exception", async () => {
      prisma.memories.count.mockRejectedValue(new Error("DB error"));

      const { memory, message } = await Memory.create({
        userId: 5,
        workspaceId: 10,
        content: "test",
      });

      expect(memory).toBeNull();
      expect(message).toBe("DB error");
    });
  });

  // ── update ─────────────────────────────────────────────────────────
  describe("update", () => {
    it("updates memory content without userId filter", async () => {
      prisma.memories.update.mockResolvedValue({
        id: 1,
        content: "updated",
      });

      const { memory, message } = await Memory.update(1, { content: "updated" });

      expect(message).toBeNull();
      expect(memory.id).toBe(1);
      expect(prisma.memories.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ content: "updated" }),
        }),
      );
    });

    it("updates memory content with userId ownership check (found)", async () => {
      prisma.memories.findFirst.mockResolvedValue({ id: 1, userId: 5 });
      prisma.memories.update.mockResolvedValue({ id: 1, content: "new" });

      const { memory, message } = await Memory.update(
        1,
        { content: "new" },
        5,
      );

      expect(message).toBeNull();
      expect(memory.id).toBe(1);
      expect(prisma.memories.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, userId: 5 },
        }),
      );
    });

    it("returns error when userId ownership check fails", async () => {
      prisma.memories.findFirst.mockResolvedValue(null);

      const { memory, message } = await Memory.update(
        1,
        { content: "new" },
        5,
      );

      expect(memory).toBeNull();
      expect(message).toContain("not owned by user");
    });

    it("returns error on exception", async () => {
      prisma.memories.update.mockRejectedValue(new Error("DB error"));

      const { memory, message } = await Memory.update(1, { content: "x" });

      expect(memory).toBeNull();
      expect(message).toBe("DB error");
    });
  });

  // ── delete ─────────────────────────────────────────────────────────
  describe("delete", () => {
    it("deletes memory by id without userId filter", async () => {
      prisma.memories.delete.mockResolvedValue({ id: 1 });

      const result = await Memory.delete(1);

      expect(result).toBe(true);
      expect(prisma.memories.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("deletes memory with userId filter (deleteMany)", async () => {
      prisma.memories.deleteMany.mockResolvedValue({ count: 1 });

      const result = await Memory.delete(1, 5);

      expect(result).toBe(true);
      expect(prisma.memories.deleteMany).toHaveBeenCalledWith({
        where: { id: 1, userId: 5 },
      });
    });

    it("returns false when userId filter matches nothing", async () => {
      prisma.memories.deleteMany.mockResolvedValue({ count: 0 });

      const result = await Memory.delete(1, 5);

      expect(result).toBe(false);
    });

    it("returns false on error", async () => {
      prisma.memories.delete.mockRejectedValue(new Error("DB error"));

      const result = await Memory.delete(1);

      expect(result).toBe(false);
    });
  });

  // ── promoteToGlobal ────────────────────────────────────────────────
  describe("promoteToGlobal", () => {
    it("promotes a workspace memory to global", async () => {
      prisma.memories.findUnique.mockResolvedValue({
        id: 1,
        userId: 5,
        scope: "workspace",
      });
      prisma.memories.count.mockResolvedValue(2);
      prisma.memories.update.mockResolvedValue({
        id: 1,
        scope: "global",
        workspaceId: null,
      });

      const { memory, message } = await Memory.promoteToGlobal(1);

      expect(message).toBeNull();
      expect(memory.scope).toBe("global");
    });

    it("returns message when memory not found", async () => {
      prisma.memories.findUnique.mockResolvedValue(null);

      const { memory, message } = await Memory.promoteToGlobal(999);

      expect(memory).toBeNull();
      expect(message).toBe("Memory not found.");
    });

    it("returns existing memory when already global", async () => {
      prisma.memories.findUnique.mockResolvedValue({
        id: 1,
        scope: "global",
      });

      const { memory, message } = await Memory.promoteToGlobal(1);

      expect(message).toBe("Memory is already global.");
      expect(memory).toBeDefined();
    });

    it("returns error when global limit reached", async () => {
      prisma.memories.findUnique.mockResolvedValue({
        id: 1,
        userId: 5,
        scope: "workspace",
      });
      prisma.memories.count.mockResolvedValue(5);

      const { memory, message } = await Memory.promoteToGlobal(1);

      expect(memory).toBeNull();
      expect(message).toContain("Maximum global memory limit");
    });
  });

  // ── demoteToWorkspace ──────────────────────────────────────────────
  describe("demoteToWorkspace", () => {
    it("demotes a global memory to workspace scope", async () => {
      prisma.memories.findUnique.mockResolvedValue({
        id: 1,
        userId: 5,
        scope: "global",
      });
      prisma.memories.count.mockResolvedValue(0);
      prisma.memories.update.mockResolvedValue({
        id: 1,
        scope: "workspace",
        workspaceId: 10,
      });

      const { memory, message } = await Memory.demoteToWorkspace(1, 10);

      expect(message).toBeNull();
      expect(memory.scope).toBe("workspace");
    });

    it("returns message when memory not found", async () => {
      prisma.memories.findUnique.mockResolvedValue(null);

      const { memory, message } = await Memory.demoteToWorkspace(999, 10);

      expect(memory).toBeNull();
      expect(message).toBe("Memory not found.");
    });

    it("returns existing memory when already workspace-scoped", async () => {
      prisma.memories.findUnique.mockResolvedValue({
        id: 1,
        scope: "workspace",
      });

      const { memory, message } = await Memory.demoteToWorkspace(1, 10);

      expect(message).toBe("Memory is already workspace-scoped.");
      expect(memory).toBeDefined();
    });

    it("returns error when workspace limit reached", async () => {
      prisma.memories.findUnique.mockResolvedValue({
        id: 1,
        userId: 5,
        scope: "global",
      });
      prisma.memories.count.mockResolvedValue(20);

      const { memory, message } = await Memory.demoteToWorkspace(1, 10);

      expect(memory).toBeNull();
      expect(message).toContain("Maximum workspace memory limit");
    });
  });

  // ── updateLastUsed ─────────────────────────────────────────────────
  describe("updateLastUsed", () => {
    it("stamps memories as used", async () => {
      prisma.memories.updateMany.mockResolvedValue({ count: 2 });

      await Memory.updateLastUsed([1, 2]);

      expect(prisma.memories.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: [1, 2] } },
          data: expect.objectContaining({ lastUsedAt: expect.any(Date) }),
        }),
      );
    });

    it("is a no-op for empty array", async () => {
      await Memory.updateLastUsed([]);
      expect(prisma.memories.updateMany).not.toHaveBeenCalled();
    });

    it("is a no-op for non-array", async () => {
      await Memory.updateLastUsed(null);
      expect(prisma.memories.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── countForScope ──────────────────────────────────────────────────
  describe("countForScope", () => {
    it("counts workspace memories", async () => {
      prisma.memories.count.mockResolvedValue(7);

      const result = await Memory.countForScope(5, 10, "workspace");

      expect(result).toBe(7);
      expect(prisma.memories.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 5, scope: "workspace", workspaceId: 10 },
        }),
      );
    });

    it("counts global memories", async () => {
      prisma.memories.count.mockResolvedValue(3);

      const result = await Memory.countForScope(5, null, "global");

      expect(result).toBe(3);
    });

    it("returns 0 on error", async () => {
      prisma.memories.count.mockRejectedValue(new Error("DB error"));

      const result = await Memory.countForScope(5, 10, "workspace");

      expect(result).toBe(0);
    });
  });

  // ── replaceWorkspaceMemories ───────────────────────────────────────
  describe("replaceWorkspaceMemories", () => {
    it("deletes old and inserts new workspace memories", async () => {
      prisma.memories.deleteMany.mockResolvedValue({ count: 3 });
      prisma.memories.create.mockResolvedValue({ id: 1 });

      const result = await Memory.replaceWorkspaceMemories(5, 10, [
        "mem1",
        "mem2",
      ]);

      expect(result).toBe(true);
      expect(prisma.memories.deleteMany).toHaveBeenCalled();
      expect(prisma.memories.create).toHaveBeenCalledTimes(2);
    });

    it("filters out empty/invalid entries", async () => {
      prisma.memories.deleteMany.mockResolvedValue({ count: 0 });
      prisma.memories.create.mockResolvedValue({ id: 1 });

      await Memory.replaceWorkspaceMemories(5, 10, [
        "valid",
        "",
        "   ",
        123,
        null,
      ]);

      expect(prisma.memories.create).toHaveBeenCalledTimes(1);
    });

    it("caps at WORKSPACE_LIMIT", async () => {
      prisma.memories.deleteMany.mockResolvedValue({ count: 0 });
      prisma.memories.create.mockResolvedValue({ id: 1 });

      const many = Array.from({ length: 30 }, (_, i) => `mem${i}`);
      await Memory.replaceWorkspaceMemories(5, 10, many);

      expect(prisma.memories.create).toHaveBeenCalledTimes(20);
    });

    it("returns false on error", async () => {
      prisma.memories.deleteMany.mockRejectedValue(new Error("DB error"));

      const result = await Memory.replaceWorkspaceMemories(5, 10, ["x"]);

      expect(result).toBe(false);
    });
  });

  // ── applyExtractedMemories ─────────────────────────────────────────
  describe("applyExtractedMemories", () => {
    it("creates workspace and global memories, and updates existing", async () => {
      prisma.memories.create.mockResolvedValue({ id: 1 });
      prisma.memories.updateMany.mockResolvedValue({ count: 1 });

      const result = await Memory.applyExtractedMemories(5, 10, [
        { content: "ws1", scope: "WORKSPACE", action: "create" },
        { content: "g1", scope: "GLOBAL", action: "create" },
        { content: "updated", scope: "WORKSPACE", action: "update", updateId: 3 },
      ], 5);

      expect(result.workspaceCount).toBe(1);
      expect(result.globalCount).toBe(1);
      expect(result.updatedCount).toBe(1);
    });

    it("filters out invalid entries", async () => {
      prisma.memories.create.mockResolvedValue({ id: 1 });

      const result = await Memory.applyExtractedMemories(5, 10, [
        { content: "valid", scope: "WORKSPACE", action: "create" },
        { content: "", scope: "WORKSPACE", action: "create" },
        { content: "bad", scope: "INVALID", action: "create" },
        { content: "bad", scope: "WORKSPACE", action: "invalid" },
        null,
        "string",
      ], 5);

      expect(result.workspaceCount).toBe(1);
      expect(result.globalCount).toBe(0);
    });

    it("respects globalSlots cap", async () => {
      prisma.memories.create.mockResolvedValue({ id: 1 });

      const result = await Memory.applyExtractedMemories(5, 10, [
        { content: "g1", scope: "GLOBAL", action: "create" },
        { content: "g2", scope: "GLOBAL", action: "create" },
        { content: "g3", scope: "GLOBAL", action: "create" },
      ], 1);

      expect(result.globalCount).toBe(1);
    });

    it("returns zero counts on error", async () => {
      prisma.memories.create.mockRejectedValue(new Error("DB error"));

      const result = await Memory.applyExtractedMemories(5, 10, [
        { content: "x", scope: "WORKSPACE", action: "create" },
      ], 5);

      expect(result.workspaceCount).toBe(0);
      expect(result.globalCount).toBe(0);
      expect(result.updatedCount).toBe(0);
    });
  });

  // ── migrateToMultiUser ─────────────────────────────────────────────
  describe("migrateToMultiUser", () => {
    it("assigns unowned memories to admin user", async () => {
      prisma.memories.updateMany.mockResolvedValue({ count: 5 });

      const result = await Memory.migrateToMultiUser(1);

      expect(result).toBe(true);
      expect(prisma.memories.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: null },
          data: { userId: 1 },
        }),
      );
    });

    it("returns false on error", async () => {
      prisma.memories.updateMany.mockRejectedValue(new Error("DB error"));

      const result = await Memory.migrateToMultiUser(1);

      expect(result).toBe(false);
    });
  });

  // ── get ────────────────────────────────────────────────────────────
  describe("get", () => {
    it("returns first matching memory", async () => {
      prisma.memories.findFirst.mockResolvedValue({ id: 1, content: "x" });

      const result = await Memory.get({ id: 1 });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it("returns null when no match", async () => {
      prisma.memories.findFirst.mockResolvedValue(null);

      const result = await Memory.get({ id: 999 });

      expect(result).toBeNull();
    });

    it("returns null on error", async () => {
      prisma.memories.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await Memory.get({ id: 1 });

      expect(result).toBeNull();
    });
  });
});
