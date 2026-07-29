// SPDX-License-Identifier: MIT
// Regression coverage for assigning first-message chat uploads to a new thread.

jest.mock("../utils/prisma", () => {
  const workspaceParsedFiles = {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  };
  return {
    workspace_parsed_files: workspaceParsedFiles,
    $transaction: jest.fn(async (callback) =>
      callback({ workspace_parsed_files: workspaceParsedFiles }),
    ),
  };
});

jest.mock("../models/eventLogs", () => ({
  EventLogs: { logEvent: jest.fn() },
}));
jest.mock("../models/documents", () => ({
  Document: {},
}));
jest.mock("../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("../utils/database/queryLimits", () => ({
  clampLimit: jest.fn((value) => value || 1000),
  MAX_LIST_LIMIT: 1000,
}));
jest.mock("../utils/http", () => ({
  safeJsonParse: jest.fn((value, fallback) => {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }),
}));

const prisma = require("../utils/prisma");
const { WorkspaceParsedFiles } = require("../models/workspaceParsedFiles");

describe("WorkspaceParsedFiles.assignToThread", () => {
  afterEach(() => jest.clearAllMocks());

  it("atomically assigns only matching unscoped files", async () => {
    prisma.workspace_parsed_files.findMany.mockResolvedValue([
      { id: 3 },
      { id: 4 },
    ]);
    prisma.workspace_parsed_files.updateMany.mockResolvedValue({ count: 2 });

    const result = await WorkspaceParsedFiles.assignToThread({
      fileIds: [3, 4],
      workspaceId: 10,
      threadId: 20,
      userId: 30,
    });

    expect(result).toEqual({ success: true, assignedCount: 2, error: null });
    expect(prisma.workspace_parsed_files.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [3, 4] },
        workspaceId: 10,
        threadId: null,
        userId: 30,
      },
      select: { id: true },
    });
    expect(prisma.workspace_parsed_files.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [3, 4] },
        workspaceId: 10,
        threadId: null,
        userId: 30,
      },
      data: { threadId: 20 },
    });
  });

  it("changes no rows when one requested file is outside the scope", async () => {
    prisma.workspace_parsed_files.findMany.mockResolvedValue([{ id: 3 }]);

    const result = await WorkspaceParsedFiles.assignToThread({
      fileIds: [3, 999],
      workspaceId: 10,
      threadId: 20,
      userId: null,
    });

    expect(result.success).toBe(false);
    expect(result.assignedCount).toBe(0);
    expect(prisma.workspace_parsed_files.updateMany).not.toHaveBeenCalled();
  });

  it("rejects invalid IDs before opening a transaction", async () => {
    const result = await WorkspaceParsedFiles.assignToThread({
      fileIds: [0],
      workspaceId: 10,
      threadId: 20,
    });

    expect(result.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
