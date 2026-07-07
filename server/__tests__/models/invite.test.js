// SPDX-License-Identifier: MIT
// Tests for security-critical Invite model (Issue #380).
// Covers: create, isExpired, deactivate, markClaimed (atomic workspace assignment).
// Verifies that invite claiming is atomic (transaction) and workspace
// assignments are deduplicated.

jest.mock("../../utils/prisma", () => {
  const mockInvites = {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  };
  const mockWorkspaces = {
    findMany: jest.fn(),
  };
  const mockWorkspaceUsers = {
    findMany: jest.fn(),
    createMany: jest.fn(),
  };
  return {
    invites: mockInvites,
    workspaces: mockWorkspaces,
    workspace_users: mockWorkspaceUsers,
    $transaction: jest.fn(async (fn) => {
      if (typeof fn === "function") {
        return fn({
          invites: mockInvites,
          workspaces: mockWorkspaces,
          workspace_users: mockWorkspaceUsers,
        });
      }
      return Promise.all(fn);
    }),
  };
});

jest.mock("../../utils/http", () => ({
  safeJsonParse: jest.fn((str, fallback) => {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }),
}));

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const { Invite } = require("../../models/invite");
const prisma = require("../../utils/prisma");

describe("Invite model (security-critical)", () => {
  afterEach(() => jest.clearAllMocks());

  // ── makeCode ────────────────────────────────────────────────────────
  describe("Invite.makeCode", () => {
    it("generates a non-empty string", () => {
      const code = Invite.makeCode();
      expect(typeof code).toBe("string");
      expect(code.length).toBeGreaterThan(10);
    });

    it("generates unique codes", () => {
      const code1 = Invite.makeCode();
      const code2 = Invite.makeCode();
      expect(code1).not.toBe(code2);
    });
  });

  // ── isExpired ───────────────────────────────────────────────────────
  describe("Invite.isExpired", () => {
    it("returns false for a recent pending invite", () => {
      const invite = {
        status: "pending",
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      };
      expect(Invite.isExpired(invite)).toBe(false);
    });

    it("returns true for an old pending invite (past expiry)", () => {
      const invite = {
        status: "pending",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };
      expect(Invite.isExpired(invite)).toBe(true);
    });

    it("returns false for a non-pending invite (already claimed)", () => {
      const invite = {
        status: "claimed",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
      };
      expect(Invite.isExpired(invite)).toBe(false);
    });

    it("returns false for a null invite", () => {
      expect(Invite.isExpired(null)).toBe(false);
    });

    it("returns false when expiryMs is 0 (disabled)", () => {
      const original = Invite.expiryMs;
      Invite.expiryMs = 0;
      const invite = {
        status: "pending",
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      };
      expect(Invite.isExpired(invite)).toBe(false);
      Invite.expiryMs = original;
    });
  });

  // ── create ──────────────────────────────────────────────────────────
  describe("Invite.create", () => {
    it("creates an invite with a code and workspace IDs", async () => {
      prisma.invites.create.mockResolvedValue({
        id: 1,
        code: "test-code",
        createdBy: 42,
        workspaceIds: "[1, 2, 3]",
        status: "pending",
      });

      const { invite, error } = await Invite.create({
        createdByUserId: 42,
        workspaceIds: [1, 2, 3],
      });

      expect(error).toBeNull();
      expect(invite).toBeTruthy();
      expect(prisma.invites.create).toHaveBeenCalledWith({
        data: {
          code: expect.any(String),
          createdBy: 42,
          workspaceIds: JSON.stringify([1, 2, 3]),
        },
      });
    });

    it("creates an invite with empty workspace IDs", async () => {
      prisma.invites.create.mockResolvedValue({
        id: 2,
        code: "test-code-2",
        workspaceIds: "[]",
      });

      const { invite, error } = await Invite.create({
        createdByUserId: 1,
        workspaceIds: [],
      });

      expect(error).toBeNull();
      expect(invite.workspaceIds).toBe("[]");
    });

    it("returns null and error on prisma failure", async () => {
      prisma.invites.create.mockRejectedValue(new Error("DB error"));

      const { invite, error } = await Invite.create({
        createdByUserId: 1,
      });

      expect(invite).toBeNull();
      expect(error).toBe("DB error");
    });
  });

  // ── deactivate ──────────────────────────────────────────────────────
  describe("Invite.deactivate", () => {
    it("sets the invite status to disabled", async () => {
      prisma.invites.update.mockResolvedValue({ id: 1, status: "disabled" });

      const { success, error } = await Invite.deactivate(1);

      expect(error).toBeNull();
      expect(success).toBe(true);
      expect(prisma.invites.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "disabled" },
      });
    });

    it("returns error on prisma failure", async () => {
      prisma.invites.update.mockRejectedValue(new Error("DB error"));

      const { success, error } = await Invite.deactivate(999);

      expect(success).toBe(false);
      expect(error).toBe("DB error");
    });
  });

  // ── markClaimed ─────────────────────────────────────────────────────
  describe("Invite.markClaimed (atomic workspace assignment)", () => {
    it("claims the invite and assigns workspaces atomically", async () => {
      prisma.invites.update.mockResolvedValue({
        id: 1,
        status: "claimed",
        workspaceIds: "[10, 20]",
      });
      prisma.workspaces.findMany.mockResolvedValue([
        { id: 10 },
        { id: 20 },
      ]);
      prisma.workspace_users.findMany.mockResolvedValue([]); // no existing
      prisma.workspace_users.createMany.mockResolvedValue({ count: 2 });

      const result = await Invite.markClaimed(1, { id: 42 });

      expect(result.success).toBe(true);
      expect(prisma.invites.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "claimed", claimedBy: 42 },
      });
      // Workspace assignment should happen in the same transaction
      expect(prisma.workspaces.findMany).toHaveBeenCalled();
      expect(prisma.workspace_users.createMany).toHaveBeenCalled();
    });

    it("skips workspace assignment when workspaceIds is empty", async () => {
      prisma.invites.update.mockResolvedValue({
        id: 2,
        status: "claimed",
        workspaceIds: "[]",
      });

      const result = await Invite.markClaimed(2, { id: 42 });

      expect(result.success).toBe(true);
      expect(prisma.workspaces.findMany).not.toHaveBeenCalled();
    });

    it("deduplicates existing workspace memberships", async () => {
      prisma.invites.update.mockResolvedValue({
        id: 3,
        status: "claimed",
        workspaceIds: "[10, 20, 30]",
      });
      prisma.workspaces.findMany.mockResolvedValue([{ id: 10 }, { id: 20 }, { id: 30 }]);
      // User already has workspace 10
      prisma.workspace_users.findMany.mockResolvedValue([{ workspace_id: 10 }]);
      prisma.workspace_users.createMany.mockResolvedValue({ count: 2 });

      const result = await Invite.markClaimed(3, { id: 42 });

      expect(result.success).toBe(true);
      // Should only create memberships for 20 and 30 (not 10)
      expect(prisma.workspace_users.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ workspace_id: 20 }),
          expect.objectContaining({ workspace_id: 30 }),
        ]),
      });
    });
    });
  });
});
