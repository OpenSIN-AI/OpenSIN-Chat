// SPDX-License-Identifier: MIT
jest.mock("../../../models/workspace", () => ({
  Workspace: {
    where: jest.fn(),
    whereWithUser: jest.fn(),
  },
}));

jest.mock("../../../models/workspaceThread", () => ({
  WorkspaceThread: {
    where: jest.fn(),
  },
}));

const { searchWorkspaceAndThreads } = require("../../../utils/helpers/search");
const { Workspace } = require("../../../models/workspace");
const { WorkspaceThread } = require("../../../models/workspaceThread");

describe("searchWorkspaceAndThreads", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns empty results for empty search term", async () => {
    const result = await searchWorkspaceAndThreads("");
    expect(result).toEqual({ workspaces: [], threads: [] });
  });

  test("returns empty results for short search term", async () => {
    const result = await searchWorkspaceAndThreads("ab");
    expect(result).toEqual({ workspaces: [], threads: [] });
  });

  test("returns empty results for whitespace search term", async () => {
    const result = await searchWorkspaceAndThreads("   ");
    expect(result).toEqual({ workspaces: [], threads: [] });
  });

  test("trims search term", async () => {
    Workspace.where.mockResolvedValue([]);
    WorkspaceThread.where.mockResolvedValue([]);
    const result = await searchWorkspaceAndThreads("   test   ");
    expect(Workspace.where).toHaveBeenCalled();
  });

  test("finds workspaces by startsWith", async () => {
    Workspace.where.mockResolvedValue([
      { slug: "test-ws", name: "Test Workspace" },
    ]);
    WorkspaceThread.where.mockResolvedValue([]);
    const result = await searchWorkspaceAndThreads("test");
    expect(result.workspaces).toHaveLength(1);
    expect(result.workspaces[0].name).toBe("Test Workspace");
  });

  test("finds workspaces by includes", async () => {
    Workspace.where.mockResolvedValue([
      { slug: "ws", name: "My Test Workspace" },
    ]);
    WorkspaceThread.where.mockResolvedValue([]);
    const result = await searchWorkspaceAndThreads("test");
    expect(result.workspaces).toHaveLength(1);
  });

  test("finds workspaces by levenshtein distance", async () => {
    Workspace.where.mockResolvedValue([
      { slug: "ws", name: "Testing" },
    ]);
    WorkspaceThread.where.mockResolvedValue([]);
    const result = await searchWorkspaceAndThreads("tseting");
    expect(result.workspaces.length).toBeGreaterThan(0);
  });

  test("finds threads by name", async () => {
    Workspace.where.mockResolvedValue([]);
    WorkspaceThread.where.mockResolvedValue([
      {
        slug: "thread-1",
        name: "My Thread",
        workspace: { slug: "ws-1", name: "Workspace 1" },
      },
    ]);
    const result = await searchWorkspaceAndThreads("thread");
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].name).toBe("My Thread");
    expect(result.threads[0].workspace).toEqual({ slug: "ws-1", name: "Workspace 1" });
  });

  test("uses user-scoped queries when user is provided", async () => {
    Workspace.whereWithUser.mockResolvedValue([]);
    WorkspaceThread.where.mockResolvedValue([]);
    const user = { id: 1 };
    await searchWorkspaceAndThreads("test", user);
    expect(Workspace.whereWithUser).toHaveBeenCalledWith(user);
  });

  test("uses unscoped queries when user is null", async () => {
    Workspace.where.mockResolvedValue([]);
    WorkspaceThread.where.mockResolvedValue([]);
    await searchWorkspaceAndThreads("test", null);
    expect(Workspace.where).toHaveBeenCalled();
  });

  test("deduplicates identical results", async () => {
    Workspace.where.mockResolvedValue([
      { slug: "ws", name: "Test" },
      { slug: "ws", name: "Test" },
    ]);
    WorkspaceThread.where.mockResolvedValue([]);
    const result = await searchWorkspaceAndThreads("test");
    expect(result.workspaces).toHaveLength(1);
  });

  test("is case-insensitive", async () => {
    Workspace.where.mockResolvedValue([
      { slug: "ws", name: "TEST WORKSPACE" },
    ]);
    WorkspaceThread.where.mockResolvedValue([]);
    const result = await searchWorkspaceAndThreads("test");
    expect(result.workspaces).toHaveLength(1);
  });

  test("converts non-string searchTerm to string", async () => {
    Workspace.where.mockResolvedValue([]);
    WorkspaceThread.where.mockResolvedValue([]);
    const result = await searchWorkspaceAndThreads(12345);
    expect(result).toEqual({ workspaces: [], threads: [] });
  });
});
