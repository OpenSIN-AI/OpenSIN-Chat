// SPDX-License-Identifier: MIT
// Tests for core DocumentVectors model (Issue #381).
// Covers: bulkInsert, where, deleteForWorkspace, deleteIds, delete.
// Verifies the cascade-delete path (document_vectors have no FK to
// workspace_documents — manual cleanup is required).

jest.mock("../../utils/prisma", () => {
  const mockDocumentVectors = {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  const mockWorkspaceDocuments = {
    findMany: jest.fn(),
  };
  return {
    document_vectors: mockDocumentVectors,
    workspace_documents: mockWorkspaceDocuments,
    $transaction: jest.fn(async (operations) => {
      if (Array.isArray(operations)) return Promise.all(operations);
      return operations({
        document_vectors: mockDocumentVectors,
        workspace_documents: mockWorkspaceDocuments,
      });
    }),
  };
});

jest.mock("../../models/documents", () => ({
  Document: {
    forWorkspace: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const { DocumentVectors } = require("../../models/vectors");
const prisma = require("../../utils/prisma");
const { Document } = require("../../models/documents");

describe("DocumentVectors model", () => {
  afterEach(() => jest.clearAllMocks());

  // ── bulkInsert ──────────────────────────────────────────────────────
  describe("DocumentVectors.bulkInsert", () => {
    it("inserts vector records in a transaction", async () => {
      const records = [
        { docId: "doc-1", vectorId: "vec-1" },
        { docId: "doc-2", vectorId: "vec-2" },
        { docId: "doc-3", vectorId: "vec-3" },
      ];
      prisma.document_vectors.create.mockResolvedValue({ id: 1 });

      const result = await DocumentVectors.bulkInsert(records);

      expect(result.documentsInserted).toBe(3);
      expect(prisma.document_vectors.create).toHaveBeenCalledTimes(3);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("returns { documentsInserted: 0 } for empty array", async () => {
      const result = await DocumentVectors.bulkInsert([]);
      expect(result.documentsInserted).toBe(0);
      expect(prisma.document_vectors.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("returns { documentsInserted: 0 } on transaction failure", async () => {
      prisma.document_vectors.create.mockResolvedValue({ id: 1 });
      prisma.$transaction.mockRejectedValue(new Error("TX failed"));

      const result = await DocumentVectors.bulkInsert([
        { docId: "doc-1", vectorId: "vec-1" },
      ]);

      expect(result.documentsInserted).toBe(0);
    });
  });

  // ── where ───────────────────────────────────────────────────────────
  describe("DocumentVectors.where", () => {
    it("returns matching vector records", async () => {
      const mockVectors = [
        { id: 1, docId: "doc-1", vectorId: "vec-1" },
        { id: 2, docId: "doc-1", vectorId: "vec-2" },
      ];
      prisma.document_vectors.findMany.mockResolvedValue(mockVectors);

      const results = await DocumentVectors.where({ docId: "doc-1" });

      expect(results).toHaveLength(2);
      expect(results[0].vectorId).toBe("vec-1");
      expect(prisma.document_vectors.findMany).toHaveBeenCalledWith({
        where: { docId: "doc-1" },
        take: undefined,
      });
    });

    it("respects a custom limit", async () => {
      prisma.document_vectors.findMany.mockResolvedValue([]);

      await DocumentVectors.where({ docId: "doc-1" }, 50);

      expect(prisma.document_vectors.findMany).toHaveBeenCalledWith({
        where: { docId: "doc-1" },
        take: 50,
      });
    });

    it("returns an empty array on prisma error", async () => {
      prisma.document_vectors.findMany.mockRejectedValue(new Error("DB error"));

      const results = await DocumentVectors.where({ docId: "doc-1" });

      expect(results).toEqual([]);
    });
  });

  // ── deleteForWorkspace ──────────────────────────────────────────────
  describe("DocumentVectors.deleteForWorkspace", () => {
    it("deletes all vectors for documents in a workspace", async () => {
      Document.forWorkspace.mockResolvedValue([
        { docId: "doc-a" },
        { docId: "doc-b" },
        { docId: "doc-a" }, // duplicate — should be deduplicated
      ]);
      prisma.document_vectors.deleteMany.mockResolvedValue({ count: 5 });

      const result = await DocumentVectors.deleteForWorkspace(10);

      expect(result).toBe(true);
      expect(Document.forWorkspace).toHaveBeenCalledWith(10);
      // Deduplicated docIds: ["doc-a", "doc-b"]
      expect(prisma.document_vectors.deleteMany).toHaveBeenCalledWith({
        where: { docId: { in: ["doc-a", "doc-b"] } },
      });
    });

    it("returns true even when workspace has no documents", async () => {
      Document.forWorkspace.mockResolvedValue([]);
      prisma.document_vectors.deleteMany.mockResolvedValue({ count: 0 });

      const result = await DocumentVectors.deleteForWorkspace(99);

      expect(result).toBe(true);
      expect(prisma.document_vectors.deleteMany).toHaveBeenCalledWith({
        where: { docId: { in: [] } },
      });
    });

    it("returns false on prisma error", async () => {
      Document.forWorkspace.mockResolvedValue([{ docId: "doc-a" }]);
      prisma.document_vectors.deleteMany.mockRejectedValue(new Error("DB error"));

      const result = await DocumentVectors.deleteForWorkspace(10);

      expect(result).toBe(false);
    });
  });

  // ── deleteIds ───────────────────────────────────────────────────────
  describe("DocumentVectors.deleteIds", () => {
    it("deletes vectors by their primary key IDs", async () => {
      prisma.document_vectors.deleteMany.mockResolvedValue({ count: 3 });

      const result = await DocumentVectors.deleteIds([1, 2, 3]);

      expect(result).toBe(true);
      expect(prisma.document_vectors.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2, 3] } },
      });
    });

    it("returns true for an empty array (no-op)", async () => {
      const result = await DocumentVectors.deleteIds([]);

      expect(result).toBe(true);
      // deleteMany is still called with an empty `in` — Prisma handles this
      // as a no-op. The model does not short-circuit.
      expect(prisma.document_vectors.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [] } },
      });
    });

    it("returns false on prisma error", async () => {
      prisma.document_vectors.deleteMany.mockRejectedValue(new Error("DB error"));

      const result = await DocumentVectors.deleteIds([1]);

      expect(result).toBe(false);
    });
  });

  // ── delete (by clause) ──────────────────────────────────────────────
  describe("DocumentVectors.delete", () => {
    it("deletes vectors matching an arbitrary clause", async () => {
      prisma.document_vectors.deleteMany.mockResolvedValue({ count: 7 });

      const result = await DocumentVectors.delete({ docId: "doc-x" });

      expect(result).toBe(true);
      expect(prisma.document_vectors.deleteMany).toHaveBeenCalledWith({
        where: { docId: "doc-x" },
      });
    });

    it("returns false on prisma error", async () => {
      prisma.document_vectors.deleteMany.mockRejectedValue(new Error("DB error"));

      const result = await DocumentVectors.delete({ docId: "doc-x" });

      expect(result).toBe(false);
    });
  });
});
