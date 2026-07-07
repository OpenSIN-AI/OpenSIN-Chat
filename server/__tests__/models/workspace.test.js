// SPDX-License-Identifier: MIT
// Tests for core Workspace model (Issue #381)
// Note: The Workspace model exposes `new` (not `create`) and `get({ slug })`
// (not `bySlug`). We test the actual API surface below.

// Mock prisma before any model requires
jest.mock("../../utils/prisma", () => {
  const mockWorkspaces = {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  };
  const mockWorkspaceThreads = {
    update: jest.fn(),
  };
  return {
    workspaces: mockWorkspaces,
    workspace_threads: mockWorkspaceThreads,
  };
});

// Mock modules that transitively require @prisma/client (not generated in test env)
jest.mock("../../models/user", () => ({
  User: { get: jest.fn(), where: jest.fn() },
}));

jest.mock("../../models/promptHistory", () => ({
  PromptHistory: { get: jest.fn(), where: jest.fn() },
}));

jest.mock("../../models/systemSettings", () => ({
  SystemSettings: {
    get: jest.fn().mockResolvedValue(null),
    saneDefaultSystemPrompt: "Default system prompt for testing.",
  },
}));

jest.mock("../../models/workspaceUsers", () => ({
  WorkspaceUser: {
    create: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock("../../models/documents", () => ({
  Document: {
    forWorkspace: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../../utils/helpers", () => ({
  getLLMProviderClass: jest.fn().mockReturnValue(null),
  getBaseLLMProviderModel: jest.fn().mockReturnValue(null),
}));

jest.mock("../../models/workspaceParsedFiles", () => ({
  WorkspaceParsedFiles: {
    totalTokenCount: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock("../../utils/middleware/multiUserProtected", () => ({
  ROLES: { admin: "admin", manager: "manager", user: "user", all: "all" },
}));

jest.mock("../../utils/database/queryLimits", () => ({
  clampLimit: jest.fn((val) => val || 1000),
  MAX_LIST_LIMIT: 1000,
}));

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const { Workspace } = require("../../models/workspace");
const prisma = require("../../utils/prisma");
const { SystemSettings } = require("../../models/systemSettings");
const { WorkspaceUser } = require("../../models/workspaceUsers");
const { Document } = require("../../models/documents");

describe("Workspace model", () => {
  afterEach(() => jest.clearAllMocks());

  // ── Workspace.new (create) ──────────────────────────────────────────
  describe("Workspace.new (create)", () => {
    it("creates a workspace with valid data", async () => {
      const mockWorkspace = {
        id: 1,
        name: "My Test Workspace",
        slug: "my-test-workspace",
        chatMode: "automatic",
      };
      prisma.workspaces.findFirst.mockResolvedValue(null); // no existing slug
      prisma.workspaces.create.mockResolvedValue(mockWorkspace);

      const { workspace, message } = await Workspace.new("My Test Workspace");

      expect(message).toBeNull();
      expect(workspace).toEqual(mockWorkspace);
      expect(prisma.workspaces.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "My Test Workspace",
          slug: "my-test-workspace",
          chatMode: "automatic",
        }),
      });
    });

    it("creates a workspace with a creator and links the user", async () => {
      const mockWorkspace = {
        id: 2,
        name: "Team Workspace",
        slug: "team-workspace",
        chatMode: "automatic",
      };
      prisma.workspaces.findFirst.mockResolvedValue(null);
      prisma.workspaces.create.mockResolvedValue(mockWorkspace);

      const { workspace, message } = await Workspace.new(
        "Team Workspace",
        42,
      );

      expect(message).toBeNull();
      expect(workspace).toEqual(mockWorkspace);
      expect(WorkspaceUser.create).toHaveBeenCalledWith(42, mockWorkspace.id);
    });

    it("returns an error when name is null", async () => {
      const { workspace, message } = await Workspace.new(null);
      expect(workspace).toBeNull();
      expect(message).toBe("name cannot be null");
      expect(prisma.workspaces.create).not.toHaveBeenCalled();
    });

    it("returns an error when name is empty/whitespace", async () => {
      const { workspace, message } = await Workspace.new("   ");
      expect(workspace).toBeNull();
      expect(message).toBe("name cannot be null");
    });

    it("generates a slug from the name", async () => {
      prisma.workspaces.findFirst.mockResolvedValue(null);
      prisma.workspaces.create.mockResolvedValue({
        id: 3,
        name: "Hello World",
        slug: "hello-world",
      });

      await Workspace.new("Hello World");

      const createCall = prisma.workspaces.create.mock.calls[0][0];
      expect(createCall.data.slug).toBe("hello-world");
    });

    it("retries slug generation on collision", async () => {
      // First findFirst returns an existing workspace (collision), second returns null
      prisma.workspaces.findFirst
        .mockResolvedValueOnce({ id: 99, slug: "test-ws" })
        .mockResolvedValueOnce(null);
      prisma.workspaces.create.mockResolvedValue({
        id: 4,
        name: "Test WS",
        slug: "test-ws-abcd1234",
      });

      const { workspace, message } = await Workspace.new("Test WS");
      expect(message).toBeNull();
      expect(workspace).toBeDefined();
      expect(prisma.workspaces.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  // ── Workspace.get ───────────────────────────────────────────────────
  describe("Workspace.get", () => {
    it("returns the workspace when found by id", async () => {
      const mockWorkspace = {
        id: 1,
        name: "Found Workspace",
        slug: "found-workspace",
        documents: [],
      };
      prisma.workspaces.findFirst.mockResolvedValue(mockWorkspace);

      const result = await Workspace.get({ id: 1 });

      expect(result).not.toBeNull();
      expect(result.id).toBe(1);
      expect(result.name).toBe("Found Workspace");
      expect(prisma.workspaces.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { documents: true },
      });
    });

    it("returns null when the workspace does not exist", async () => {
      prisma.workspaces.findFirst.mockResolvedValue(null);

      const result = await Workspace.get({ id: 99999 });

      expect(result).toBeNull();
    });

    it("returns null on prisma error", async () => {
      prisma.workspaces.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await Workspace.get({ id: 1 });

      expect(result).toBeNull();
    });
  });

  // ── Workspace.get by slug (equivalent to bySlug) ────────────────────
  describe("Workspace.get by slug (bySlug equivalent)", () => {
    it("returns the workspace when found by slug", async () => {
      const mockWorkspace = {
        id: 5,
        name: "Slug Workspace",
        slug: "my-slug",
        documents: [],
      };
      prisma.workspaces.findFirst.mockResolvedValue(mockWorkspace);

      const result = await Workspace.get({ slug: "my-slug" });

      expect(result).not.toBeNull();
      expect(result.slug).toBe("my-slug");
      expect(prisma.workspaces.findFirst).toHaveBeenCalledWith({
        where: { slug: "my-slug" },
        include: { documents: true },
      });
    });

    it("returns null when slug does not exist", async () => {
      prisma.workspaces.findFirst.mockResolvedValue(null);

      const result = await Workspace.get({ slug: "non-existent-slug" });

      expect(result).toBeNull();
    });
  });

  // ── Workspace.update ────────────────────────────────────────────────
  describe("Workspace.update", () => {
    it("updates the workspace name", async () => {
      const updated = {
        id: 1,
        name: "Updated Name",
        slug: "my-workspace",
      };
      prisma.workspaces.update.mockResolvedValue(updated);

      const { workspace, message } = await Workspace.update(1, {
        name: "Updated Name",
      });

      expect(message).toBeNull();
      expect(workspace).toEqual(updated);
      expect(prisma.workspaces.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ name: "Updated Name" }),
      });
    });

    it("throws when no id is provided", async () => {
      await expect(Workspace.update(null, { name: "X" })).rejects.toThrow(
        "No workspace id provided for update",
      );
    });

    it("returns a message when no valid fields are provided", async () => {
      const { workspace, message } = await Workspace.update(1, {
        invalidField: "value",
      });

      expect(message).toBe("No valid fields to update!");
      expect(workspace).toEqual({ id: 1 });
      expect(prisma.workspaces.update).not.toHaveBeenCalled();
    });

    it("returns null workspace and error message on prisma failure", async () => {
      prisma.workspaces.update.mockRejectedValue(new Error("DB error"));

      const { workspace, message } = await Workspace.update(1, {
        name: "New Name",
      });

      expect(workspace).toBeNull();
      expect(message).toBe("DB error");
    });
  });

  // ── Workspace.delete ────────────────────────────────────────────────
  describe("Workspace.delete", () => {
    it("deletes the workspace and returns true", async () => {
      prisma.workspaces.delete.mockResolvedValue({ id: 1 });

      const result = await Workspace.delete({ id: 1 });

      expect(result).toBe(true);
      expect(prisma.workspaces.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("returns false when the workspace does not exist", async () => {
      prisma.workspaces.delete.mockRejectedValue(
        new Error("Record not found"),
      );

      const result = await Workspace.delete({ id: 99999 });

      expect(result).toBe(false);
    });

    it("verifies the workspace is gone after deletion", async () => {
      prisma.workspaces.delete.mockResolvedValue({ id: 1 });
      // After deletion, findFirst returns null
      prisma.workspaces.findFirst.mockResolvedValue(null);

      await Workspace.delete({ id: 1 });
      const verify = await Workspace.get({ id: 1 });

      expect(verify).toBeNull();
      expect(prisma.workspaces.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
