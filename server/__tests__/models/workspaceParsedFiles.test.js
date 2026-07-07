// SPDX-License-Identifier: MIT
// Tests for core WorkspaceParsedFiles model (Issue #381).
// Covers: create, get, where, delete, totalTokenCount.
// Verifies EventLogs integration on create and graceful error handling.

jest.mock("../../utils/prisma", () => {
  const mockParsedFiles = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    aggregate: jest.fn(),
  };
  return {
    workspace_parsed_files: mockParsedFiles,
  };
});

jest.mock("../../models/eventLogs", () => ({
  EventLogs: {
    logEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../models/documents", () => ({
  Document: {
    forWorkspace: jest.fn().mockResolvedValue([]),
    get: jest.fn(),
    addDocuments: jest.fn(),
  },
}));

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("../../utils/database/queryLimits", () => ({
  clampLimit: jest.fn((val) => val || 1000),
  MAX_LIST_LIMIT: 1000,
}));

jest.mock("../../utils/http", () => ({
  safeJsonParse: jest.fn((str, fallback) => {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }),
}));

const { WorkspaceParsedFiles } = require("../../models/workspaceParsedFiles");
const prisma = require("../../utils/prisma");
const { EventLogs } = require("../../models/eventLogs");

describe("WorkspaceParsedFiles model", () => {
  afterEach(() => jest.clearAllMocks());

  // ── create ──────────────────────────────────────────────────────────
  describe("WorkspaceParsedFiles.create", () => {
    it("creates a parsed file record with valid data", async () => {
      const mockFile = {
        id: 1,
        filename: "report.pdf",
        workspaceId: 10,
        userId: null,
        threadId: null,
        metadata: null,
        tokenCountEstimate: 500,
      };
      prisma.workspace_parsed_files.create.mockResolvedValue(mockFile);

      const { file, error } = await WorkspaceParsedFiles.create({
        filename: "report.pdf",
        workspaceId: 10,
        tokenCountEstimate: 500,
      });

      expect(error).toBeNull();
      expect(file).toEqual(mockFile);
      expect(prisma.workspace_parsed_files.create).toHaveBeenCalledWith({
        data: {
          filename: "report.pdf",
          workspaceId: 10,
          userId: null,
          threadId: null,
          metadata: null,
          tokenCountEstimate: 500,
        },
      });
    });

    it("creates a file with user and thread scope", async () => {
      prisma.workspace_parsed_files.create.mockResolvedValue({
        id: 2,
        filename: "doc.pdf",
        workspaceId: 5,
        userId: 42,
        threadId: 7,
      });

      const { file, error } = await WorkspaceParsedFiles.create({
        filename: "doc.pdf",
        workspaceId: 5,
        userId: 42,
        threadId: 7,
        metadata: '{"location":"uploads/doc.pdf"}',
        tokenCountEstimate: 1000,
      });

      expect(error).toBeNull();
      const createCall = prisma.workspace_parsed_files.create.mock.calls[0][0];
      expect(createCall.data.userId).toBe(42);
      expect(createCall.data.threadId).toBe(7);
      expect(createCall.data.metadata).toBe('{"location":"uploads/doc.pdf"}');
    });

    it("logs a workspace_file_uploaded event on success", async () => {
      prisma.workspace_parsed_files.create.mockResolvedValue({ id: 1 });

      await WorkspaceParsedFiles.create({
        filename: "test.pdf",
        workspaceId: 10,
        userId: 42,
      });

      expect(EventLogs.logEvent).toHaveBeenCalledWith(
        "workspace_file_uploaded",
        { filename: "test.pdf", workspaceId: 10 },
        42,
      );
    });

    it("returns null file and error on prisma failure", async () => {
      prisma.workspace_parsed_files.create.mockRejectedValue(
        new Error("DB error"),
      );

      const { file, error } = await WorkspaceParsedFiles.create({
        filename: "test.pdf",
        workspaceId: 10,
      });

      expect(file).toBeNull();
      expect(error).toBe("DB error");
      expect(EventLogs.logEvent).not.toHaveBeenCalled();
    });

    it("handles invalid workspaceId gracefully (parseInt fallback)", async () => {
      prisma.workspace_parsed_files.create.mockResolvedValue({ id: 1 });

      await WorkspaceParsedFiles.create({
        filename: "test.pdf",
        workspaceId: "not-a-number",
      });

      const createCall = prisma.workspace_parsed_files.create.mock.calls[0][0];
      expect(createCall.data.workspaceId).toBeNull(); // parseInt("not-a-number") || null
    });
  });

  // ── get ─────────────────────────────────────────────────────────────
  describe("WorkspaceParsedFiles.get", () => {
    it("returns the file when found", async () => {
      const mockFile = {
        id: 1,
        filename: "doc.pdf",
        workspaceId: 10,
      };
      prisma.workspace_parsed_files.findFirst.mockResolvedValue(mockFile);

      const result = await WorkspaceParsedFiles.get({ id: 1 });

      expect(result).toEqual(mockFile);
      expect(prisma.workspace_parsed_files.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("returns null when file does not exist", async () => {
      prisma.workspace_parsed_files.findFirst.mockResolvedValue(null);

      const result = await WorkspaceParsedFiles.get({ id: 999 });

      expect(result).toBeNull();
    });

    it("returns null on prisma error", async () => {
      prisma.workspace_parsed_files.findFirst.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await WorkspaceParsedFiles.get({ id: 1 });

      expect(result).toBeNull();
    });
  });

  // ── where ───────────────────────────────────────────────────────────
  describe("WorkspaceParsedFiles.where", () => {
    it("lists files matching a clause", async () => {
      const mockFiles = [
        { id: 1, filename: "a.pdf", workspaceId: 10 },
        { id: 2, filename: "b.pdf", workspaceId: 10 },
      ];
      prisma.workspace_parsed_files.findMany.mockResolvedValue(mockFiles);

      const results = await WorkspaceParsedFiles.where({ workspaceId: 10 });

      expect(results).toHaveLength(2);
      expect(results[0].filename).toBe("a.pdf");
      expect(prisma.workspace_parsed_files.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 10 },
        take: 1000,
      });
    });

    it("respects a custom limit", async () => {
      prisma.workspace_parsed_files.findMany.mockResolvedValue([]);

      await WorkspaceParsedFiles.where({ workspaceId: 10 }, 50);

      expect(prisma.workspace_parsed_files.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it("respects a custom orderBy", async () => {
      prisma.workspace_parsed_files.findMany.mockResolvedValue([]);

      await WorkspaceParsedFiles.where(
        { workspaceId: 10 },
        null,
        { createdAt: "desc" },
      );

      expect(prisma.workspace_parsed_files.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: "desc" } }),
      );
    });

    it("respects a custom select", async () => {
      prisma.workspace_parsed_files.findMany.mockResolvedValue([]);

      const select = { id: true, filename: true };
      await WorkspaceParsedFiles.where(
        { workspaceId: 10 },
        null,
        null,
        select,
      );

      expect(prisma.workspace_parsed_files.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ select }),
      );
    });

    it("returns an empty array on prisma error", async () => {
      prisma.workspace_parsed_files.findMany.mockRejectedValue(
        new Error("DB error"),
      );

      const results = await WorkspaceParsedFiles.where({ workspaceId: 10 });

      expect(results).toEqual([]);
    });
  });

  // ── delete ──────────────────────────────────────────────────────────
  describe("WorkspaceParsedFiles.delete", () => {
    it("deletes files matching the clause and returns true", async () => {
      prisma.workspace_parsed_files.deleteMany.mockResolvedValue({ count: 3 });

      const result = await WorkspaceParsedFiles.delete({ workspaceId: 10 });

      expect(result).toBe(true);
      expect(prisma.workspace_parsed_files.deleteMany).toHaveBeenCalledWith({
        where: { workspaceId: 10 },
      });
    });

    it("returns false when no files were deleted", async () => {
      prisma.workspace_parsed_files.deleteMany.mockResolvedValue({ count: 0 });

      const result = await WorkspaceParsedFiles.delete({ id: 999 });

      expect(result).toBe(false);
    });

    it("returns false on prisma error", async () => {
      prisma.workspace_parsed_files.deleteMany.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await WorkspaceParsedFiles.delete({ workspaceId: 10 });

      expect(result).toBe(false);
    });
  });

  // ── totalTokenCount ─────────────────────────────────────────────────
  describe("WorkspaceParsedFiles.totalTokenCount", () => {
    it("returns the sum of tokenCountEstimate for matching files", async () => {
      prisma.workspace_parsed_files.aggregate.mockResolvedValue({
        _sum: { tokenCountEstimate: 15000 },
      });

      const result = await WorkspaceParsedFiles.totalTokenCount({
        workspaceId: 10,
      });

      expect(result).toBe(15000);
      expect(prisma.workspace_parsed_files.aggregate).toHaveBeenCalledWith({
        where: { workspaceId: 10 },
        _sum: { tokenCountEstimate: true },
      });
    });

    it("returns 0 when _sum.tokenCountEstimate is null (no matching files)", async () => {
      prisma.workspace_parsed_files.aggregate.mockResolvedValue({
        _sum: { tokenCountEstimate: null },
      });

      const result = await WorkspaceParsedFiles.totalTokenCount({
        workspaceId: 99,
      });

      expect(result).toBe(0);
    });

    it("returns 0 on prisma error", async () => {
      prisma.workspace_parsed_files.aggregate.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await WorkspaceParsedFiles.totalTokenCount({
        workspaceId: 10,
      });

      expect(result).toBe(0);
    });
  });
});
