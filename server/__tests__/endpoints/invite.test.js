// SPDX-License-Identifier: MIT
jest.mock("../../utils/prisma", () => ({
  invites: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

const { Invite } = require("../../models/invite");
const prisma = require("../../utils/prisma");

jest.mock("../../models/workspace", () => ({
  Workspace: {
    where: jest.fn(),
  },
}));

jest.mock("../../models/workspaceUsers", () => ({
  WorkspaceUser: {
    createMany: jest.fn(),
  },
}));

jest.mock("../../models/user", () => ({
  User: {
    get: jest.fn(),
  },
}));

const { Workspace } = require("../../models/workspace");
const { WorkspaceUser } = require("../../models/workspaceUsers");
const { User } = require("../../models/user");

describe("Invite model", () => {
  afterEach(() => jest.clearAllMocks());

  describe("makeCode", () => {
    it("returns a non-empty string", () => {
      const code = Invite.makeCode();
      expect(typeof code).toBe("string");
      expect(code.length).toBeGreaterThan(0);
    });

    it("returns unique codes on successive calls", () => {
      const code1 = Invite.makeCode();
      const code2 = Invite.makeCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe("create", () => {
    it("creates an invite with generated code", async () => {
      const mockInvite = { id: 1, code: "abc123", createdBy: 5, workspaceIds: "[1,2]" };
      prisma.invites.create.mockResolvedValue(mockInvite);

      const { invite, error } = await Invite.create({ createdByUserId: 5, workspaceIds: [1, 2] });
      expect(invite).toEqual(mockInvite);
      expect(error).toBeNull();
      expect(prisma.invites.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          createdBy: 5,
          workspaceIds: "[1,2]",
        }),
      });
    });

    it("creates invite with empty workspaceIds by default", async () => {
      prisma.invites.create.mockResolvedValue({ id: 2, code: "def456", workspaceIds: "[]" });

      const { invite } = await Invite.create({});
      expect(prisma.invites.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ workspaceIds: "[]" }),
      });
    });

    it("returns error when prisma throws", async () => {
      prisma.invites.create.mockRejectedValue(new Error("db error"));
      const { invite, error } = await Invite.create({ createdByUserId: 1 });
      expect(invite).toBeNull();
      expect(error).toBe("db error");
    });
  });

  describe("deactivate", () => {
    it("sets status to disabled", async () => {
      prisma.invites.update.mockResolvedValue({ id: 1, status: "disabled" });
      const { success, error } = await Invite.deactivate(1);
      expect(success).toBe(true);
      expect(error).toBeNull();
      expect(prisma.invites.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "disabled" },
      });
    });

    it("converts id to Number", async () => {
      prisma.invites.update.mockResolvedValue({ id: 5, status: "disabled" });
      await Invite.deactivate("5");
      expect(prisma.invites.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { status: "disabled" },
      });
    });

    it("returns error when prisma throws", async () => {
      prisma.invites.update.mockRejectedValue(new Error("not found"));
      const { success, error } = await Invite.deactivate(999);
      expect(success).toBe(false);
      expect(error).toBe("not found");
    });
  });

  describe("markClaimed", () => {
    it("updates status to claimed and adds user to workspaces", async () => {
      prisma.invites.update.mockResolvedValue({
        id: 1,
        status: "claimed",
        claimedBy: 10,
        workspaceIds: "[1,2]",
      });
      Workspace.where.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
      WorkspaceUser.createMany.mockResolvedValue(true);

      const { success, error } = await Invite.markClaimed(1, { id: 10 });
      expect(success).toBe(true);
      expect(error).toBeNull();
      expect(WorkspaceUser.createMany).toHaveBeenCalledWith(10, [1, 2]);
    });

    it("skips workspace assignment when workspaceIds is empty", async () => {
      prisma.invites.update.mockResolvedValue({
        id: 2,
        status: "claimed",
        claimedBy: 10,
        workspaceIds: "[]",
      });

      const { success } = await Invite.markClaimed(2, { id: 10 });
      expect(success).toBe(true);
      expect(WorkspaceUser.createMany).not.toHaveBeenCalled();
    });

    it("skips workspace assignment when workspaceIds is null/falsy", async () => {
      prisma.invites.update.mockResolvedValue({
        id: 3,
        status: "claimed",
        claimedBy: 10,
        workspaceIds: null,
      });

      const { success } = await Invite.markClaimed(3, { id: 10 });
      expect(success).toBe(true);
      expect(WorkspaceUser.createMany).not.toHaveBeenCalled();
    });

    it("still succeeds when workspace assignment fails", async () => {
      prisma.invites.update.mockResolvedValue({
        id: 4,
        status: "claimed",
        claimedBy: 10,
        workspaceIds: "[99]",
      });
      Workspace.where.mockResolvedValue([{ id: 1 }]);
      WorkspaceUser.createMany.mockRejectedValue(new Error("fail"));

      const { success, error } = await Invite.markClaimed(4, { id: 10 });
      expect(success).toBe(true);
      expect(error).toBeNull();
    });

    it("returns error when prisma update fails", async () => {
      prisma.invites.update.mockRejectedValue(new Error("db fail"));
      const { success, error } = await Invite.markClaimed(999, { id: 10 });
      expect(success).toBe(false);
      expect(error).toBe("db fail");
    });
  });

  describe("get", () => {
    it("returns invite when found", async () => {
      const invite = { id: 1, code: "abc" };
      prisma.invites.findFirst.mockResolvedValue(invite);
      expect(await Invite.get({ code: "abc" })).toEqual(invite);
    });

    it("returns null when not found", async () => {
      prisma.invites.findFirst.mockResolvedValue(null);
      expect(await Invite.get({ code: "missing" })).toBeNull();
    });

    it("returns null on error", async () => {
      prisma.invites.findFirst.mockRejectedValue(new Error("fail"));
      expect(await Invite.get({})).toBeNull();
    });
  });

  describe("count", () => {
    it("returns count from prisma", async () => {
      prisma.invites.count.mockResolvedValue(5);
      expect(await Invite.count({ status: "pending" })).toBe(5);
    });

    it("returns 0 on error", async () => {
      prisma.invites.count.mockRejectedValue(new Error("fail"));
      expect(await Invite.count({})).toBe(0);
    });
  });

  describe("delete", () => {
    it("returns true on success", async () => {
      prisma.invites.deleteMany.mockResolvedValue({ count: 1 });
      expect(await Invite.delete({ id: 1 })).toBe(true);
    });

    it("returns false on error", async () => {
      prisma.invites.deleteMany.mockRejectedValue(new Error("fail"));
      expect(await Invite.delete({ id: 1 })).toBe(false);
    });
  });

  describe("where", () => {
    it("returns matching invites", async () => {
      const invites = [{ id: 1 }, { id: 2 }];
      prisma.invites.findMany.mockResolvedValue(invites);
      expect(await Invite.where({ status: "pending" })).toEqual(invites);
    });

    it("passes limit to prisma", async () => {
      prisma.invites.findMany.mockResolvedValue([]);
      await Invite.where({}, 10);
      expect(prisma.invites.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });

    it("returns empty array on error", async () => {
      prisma.invites.findMany.mockRejectedValue(new Error("fail"));
      expect(await Invite.where({})).toEqual([]);
    });
  });

  describe("whereWithUsers", () => {
    it("resolves claimedBy to user object", async () => {
      prisma.invites.findMany.mockResolvedValue([
        { id: 1, claimedBy: 10, createdBy: 20 },
      ]);
      User.get.mockImplementation((clause) => {
        if (clause.id === 10) return { id: 10, username: "claimer" };
        if (clause.id === 20) return { id: 20, username: "creator" };
        return null;
      });

      const result = await Invite.whereWithUsers({});
      expect(result[0].claimedBy).toEqual({ id: 10, username: "claimer" });
      expect(result[0].createdBy).toEqual({ id: 20, username: "creator" });
    });

    it("skips user resolution when claimedBy/createdBy is falsy", async () => {
      prisma.invites.findMany.mockResolvedValue([
        { id: 1, claimedBy: null, createdBy: 0 },
      ]);
      User.get.mockResolvedValue(null);

      const result = await Invite.whereWithUsers({});
      expect(result[0].claimedBy).toBeNull();
    });

    it("returns empty array on error", async () => {
      prisma.invites.findMany.mockRejectedValue(new Error("fail"));
      expect(await Invite.whereWithUsers({})).toEqual([]);
    });
  });
});
