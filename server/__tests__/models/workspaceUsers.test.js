// SPDX-License-Identifier: MIT
// Tests for security-critical WorkspaceUser model (Issue #380).
// Covers: create, createMany, createManyUsers, get, where, count, delete.
// Verifies role/workspace assignment and transaction safety.

jest.mock("../../utils/prisma", () => {
  const mockWorkspaceUsers = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  };
  return {
    workspace_users: mockWorkspaceUsers,
    $transaction: jest.fn(async (ops) => Promise.all(ops)),
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

const { WorkspaceUser } = require("../../models/workspaceUsers");
const prisma = require("../../utils/prisma");

describe("WorkspaceUser model (security-critical)", () => {
  afterEach(() => jest.clearAllMocks());

  // ── create ──────────────────────────────────────────────────────────
  describe("WorkspaceUser.create", () => {
    it("creates a workspace-user relationship", async () => {
      prisma.workspace_users.create.mockResolvedValue({
        id: 1,
        user_id: 42,
        workspace_id: 10,
      });

      const result = await WorkspaceUser.create(42, 10);

      expect(result).toBe(true);
      expect(prisma.workspace_users.create).toHaveBeenCalledWith({
        data: { user_id: 42, workspace_id: 10 },
      });
    });

    it("returns false on prisma error (duplicate relationship)", async () => {
      prisma.workspace_users.create.mockRejectedValue(new Error("DB error"));

      const result = await WorkspaceUser.create(42, 10);

      expect(result).toBe(false);
    });

    it("converts string IDs to numbers", async () => {
      prisma.workspace_users.create.mockResolvedValue({ id: 2 });

      await WorkspaceUser.create("42", "10");

      expect(prisma.workspace_users.create).toHaveBeenCalledWith({
        data: { user_id: 42, workspace_id: 10 },
      });
    });
  });

  // ── createMany ──────────────────────────────────────────────────────
  describe("WorkspaceUser.createMany (user → multiple workspaces)", () => {
    it("creates relationships for a user across multiple workspaces", async () => {
      prisma.workspace_users.create.mockResolvedValue({ id: 1 });

      await WorkspaceUser.createMany(42, [10, 20, 30]);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.workspace_users.create).toHaveBeenCalledTimes(3);
    });

    it("is a no-op when workspaceIds is empty", async () => {
      await WorkspaceUser.createMany(42, []);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.workspace_users.create).not.toHaveBeenCalled();
    });
  });

  // ── createManyUsers ──────────────────────────────────────────────────
  describe("WorkspaceUser.createManyUsers (multiple users → one workspace)", () => {
    it("creates relationships for multiple users to a workspace", async () => {
      prisma.workspace_users.create.mockResolvedValue({ id: 1 });

      await WorkspaceUser.createManyUsers([1, 2, 3], 10);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.workspace_users.create).toHaveBeenCalledTimes(3);
    });

    it("is a no-op when userIds is empty", async () => {
      await WorkspaceUser.createManyUsers([], 10);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ── get ─────────────────────────────────────────────────────────────
  describe("WorkspaceUser.get", () => {
    it("returns the relationship when found", async () => {
      const mockRel = { id: 1, user_id: 42, workspace_id: 10 };
      prisma.workspace_users.findFirst.mockResolvedValue(mockRel);

      const result = await WorkspaceUser.get({ user_id: 42, workspace_id: 10 });

      expect(result).toEqual(mockRel);
    });

    it("returns null when not found", async () => {
      prisma.workspace_users.findFirst.mockResolvedValue(null);

      const result = await WorkspaceUser.get({ user_id: 999 });

      expect(result).toBeNull();
    });

    it("returns null on prisma error", async () => {
      prisma.workspace_users.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await WorkspaceUser.get({ user_id: 42 });

      expect(result).toBeNull();
    });
  });

  // ── where ───────────────────────────────────────────────────────────
  describe("WorkspaceUser.where", () => {
    it("lists relationships matching the clause", async () => {
      const mockRels = [
        { id: 1, user_id: 42, workspace_id: 10 },
        { id: 2, user_id: 42, workspace_id: 20 },
      ];
      prisma.workspace_users.findMany.mockResolvedValue(mockRels);

      const results = await WorkspaceUser.where({ user_id: 42 });

      expect(results).toHaveLength(2);
      expect(results[0].workspace_id).toBe(10);
    });

    it("respects a custom limit", async () => {
      prisma.workspace_users.findMany.mockResolvedValue([]);

      await WorkspaceUser.where({ user_id: 42 }, 50);

      expect(prisma.workspace_users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it("returns an empty array on prisma error", async () => {
      prisma.workspace_users.findMany.mockRejectedValue(new Error("DB error"));

      const results = await WorkspaceUser.where({ user_id: 42 });

      expect(results).toEqual([]);
    });
  });

  // ── count ───────────────────────────────────────────────────────────
  describe("WorkspaceUser.count", () => {
    it("returns the count of relationships matching the clause", async () => {
      prisma.workspace_users.count.mockResolvedValue(5);

      const result = await WorkspaceUser.count({ workspace_id: 10 });

      expect(result).toBe(5);
    });

    it("returns 0 on prisma error", async () => {
      prisma.workspace_users.count.mockRejectedValue(new Error("DB error"));

      const result = await WorkspaceUser.count({ workspace_id: 10 });

      expect(result).toBe(0);
    });
  });

  // ── delete ──────────────────────────────────────────────────────────
  describe("WorkspaceUser.delete", () => {
    it("deletes relationships matching the clause", async () => {
      prisma.workspace_users.deleteMany.mockResolvedValue({ count: 3 });

      await WorkspaceUser.delete({ user_id: 42, workspace_id: 10 });

      expect(prisma.workspace_users.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 42, workspace_id: 10 },
      });
    });

    it("does not throw on prisma error (silent failure)", async () => {
      prisma.workspace_users.deleteMany.mockRejectedValue(new Error("DB error"));

      await expect(WorkspaceUser.delete({ user_id: 42 })).resolves.not.toThrow();
    });
  });
});
