// SPDX-License-Identifier: MIT
// Tests for core WorkspaceChats model (Issue #381)
// Note: The WorkspaceChats model exposes `new` (not `create`).

jest.mock("../../utils/prisma", () => {
  const mockWorkspaceChats = {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
  const mockWorkspaceThreads = {
    update: jest.fn(),
  };
  return {
    workspace_chats: mockWorkspaceChats,
    workspace_threads: mockWorkspaceThreads,
  };
});

jest.mock("../../utils/helpers/chat/responses", () => ({
  safeJSONStringify: jest.fn((obj) => JSON.stringify(obj)),
}));

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const { WorkspaceChats } = require("../../models/workspaceChats");
const prisma = require("../../utils/prisma");

describe("WorkspaceChats model", () => {
  afterEach(() => jest.clearAllMocks());

  // ── WorkspaceChats.new (create) ─────────────────────────────────────
  describe("WorkspaceChats.new (create)", () => {
    it("creates a new chat with valid data", async () => {
      const mockChat = {
        id: 1,
        workspaceId: 10,
        prompt: "Hello, what is this?",
        response: '{"text":"Hi there!"}',
        user_id: null,
        thread_id: null,
        include: true,
      };
      prisma.workspace_chats.create.mockResolvedValue(mockChat);

      const { chat, message } = await WorkspaceChats.new({
        workspaceId: 10,
        prompt: "Hello, what is this?",
        response: { text: "Hi there!" },
      });

      expect(message).toBeNull();
      expect(chat).toEqual(mockChat);
      expect(prisma.workspace_chats.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 10,
          prompt: "Hello, what is this?",
          response: expect.any(String),
          include: true,
        }),
      });
    });

    it("creates a chat with a user and thread", async () => {
      const mockChat = {
        id: 2,
        workspaceId: 5,
        prompt: "Follow up question",
        response: '{"text":"Answer"}',
        user_id: 3,
        thread_id: 7,
        include: true,
      };
      prisma.workspace_chats.create.mockResolvedValue(mockChat);
      prisma.workspace_threads.update.mockResolvedValue({});

      const { chat, message } = await WorkspaceChats.new({
        workspaceId: 5,
        prompt: "Follow up question",
        response: { text: "Answer" },
        user: { id: 3 },
        threadId: 7,
      });

      expect(message).toBeNull();
      expect(chat).toEqual(mockChat);
      expect(prisma.workspace_chats.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 5,
          user_id: 3,
          thread_id: 7,
        }),
      });
      // Thread's lastUpdatedAt should be updated
      expect(prisma.workspace_threads.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: expect.objectContaining({ lastUpdatedAt: expect.any(Date) }),
      });
    });

    it("returns null chat and error message on prisma failure", async () => {
      prisma.workspace_chats.create.mockRejectedValue(new Error("DB error"));

      const { chat, message } = await WorkspaceChats.new({
        workspaceId: 1,
        prompt: "test",
      });

      expect(chat).toBeNull();
      expect(message).toBe("DB error");
    });
  });

  // ── WorkspaceChats.forWorkspace ─────────────────────────────────────
  describe("WorkspaceChats.forWorkspace", () => {
    it("lists chats for a workspace", async () => {
      const mockChats = [
        {
          id: 1,
          prompt: "Question 1",
          response: '{"text":"Answer 1"}',
          createdAt: new Date(),
          feedbackScore: null,
        },
        {
          id: 2,
          prompt: "Question 2",
          response: '{"text":"Answer 2"}',
          createdAt: new Date(),
          feedbackScore: null,
        },
      ];
      prisma.workspace_chats.findMany.mockResolvedValue(mockChats);

      const chats = await WorkspaceChats.forWorkspace(10);

      expect(chats).toHaveLength(2);
      expect(chats[0].prompt).toBe("Question 1");
      expect(chats[1].prompt).toBe("Question 2");
      expect(prisma.workspace_chats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 10,
            thread_id: null,
            api_session_id: null,
            include: true,
          }),
        }),
      );
    });

    it("returns an empty array when workspaceId is null", async () => {
      const chats = await WorkspaceChats.forWorkspace(null);
      expect(chats).toEqual([]);
      expect(prisma.workspace_chats.findMany).not.toHaveBeenCalled();
    });

    it("returns an empty array on prisma error", async () => {
      prisma.workspace_chats.findMany.mockRejectedValue(new Error("DB error"));

      const chats = await WorkspaceChats.forWorkspace(10);
      expect(chats).toEqual([]);
    });

    it("respects a custom orderBy", async () => {
      prisma.workspace_chats.findMany.mockResolvedValue([]);

      await WorkspaceChats.forWorkspace(10, null, { id: "desc" });

      expect(prisma.workspace_chats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { id: "desc" },
        }),
      );
    });
  });

  // ── WorkspaceChats.delete ───────────────────────────────────────────
  describe("WorkspaceChats.delete", () => {
    it("deletes chats matching the clause and returns true", async () => {
      prisma.workspace_chats.deleteMany.mockResolvedValue({ count: 3 });

      const result = await WorkspaceChats.delete({ workspaceId: 10 });

      expect(result).toBe(true);
      expect(prisma.workspace_chats.deleteMany).toHaveBeenCalledWith({
        where: { workspaceId: 10 },
      });
    });

    it("returns false on prisma error", async () => {
      prisma.workspace_chats.deleteMany.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await WorkspaceChats.delete({ workspaceId: 99 });
      expect(result).toBe(false);
    });

    it("verifies chats are gone after deletion", async () => {
      prisma.workspace_chats.deleteMany.mockResolvedValue({ count: 1 });
      // After deletion, findMany returns empty
      prisma.workspace_chats.findMany.mockResolvedValue([]);

      await WorkspaceChats.delete({ workspaceId: 10 });
      const remaining = await WorkspaceChats.forWorkspace(10);

      expect(remaining).toEqual([]);
    });
  });
});
