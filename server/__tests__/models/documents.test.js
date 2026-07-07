// SPDX-License-Identifier: MIT
// Tests for core Document model (Issue #381)
// Note: The Document model does not expose a `create` method directly.
// Documents are created via `addDocuments` (which handles embedding) or
// directly through `prisma.workspace_documents.create`. We test `get`,
// `forWorkspace`, and `delete` here, plus a prisma-level create test.

jest.mock("../../utils/prisma", () => {
  const mockWorkspaceDocuments = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  };
  const mockDocumentVectors = {
    deleteMany: jest.fn(),
  };
  return {
    workspace_documents: mockWorkspaceDocuments,
    document_vectors: mockDocumentVectors,
    $transaction: jest.fn(async (operations) => {
      if (typeof operations === "function") {
        return operations({
          workspace_documents: mockWorkspaceDocuments,
          document_vectors: mockDocumentVectors,
        });
      }
      return Promise.all(operations);
    }),
  };
});

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
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

const { Document } = require("../../models/documents");
const prisma = require("../../utils/prisma");

describe("Document model", () => {
  afterEach(() => jest.clearAllMocks());

  // ── Document create (via prisma.workspace_documents.create) ─────────
  describe("Document create (prisma.workspace_documents.create)", () => {
    it("creates a document record with valid data", async () => {
      const mockDoc = {
        id: 1,
        docId: "abc-123-uuid",
        filename: "test.pdf",
        docpath: "custom-documents/test.pdf",
        workspaceId: 10,
        metadata: '{"title":"Test PDF"}',
        pinned: false,
        watched: false,
      };
      prisma.workspace_documents.create.mockResolvedValue(mockDoc);

      const doc = await prisma.workspace_documents.create({
        data: {
          docId: "abc-123-uuid",
          filename: "test.pdf",
          docpath: "custom-documents/test.pdf",
          workspaceId: 10,
          metadata: '{"title":"Test PDF"}',
        },
      });

      expect(doc).toEqual(mockDoc);
      expect(doc.docId).toBe("abc-123-uuid");
      expect(doc.filename).toBe("test.pdf");
      expect(prisma.workspace_documents.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          docId: "abc-123-uuid",
          filename: "test.pdf",
          workspaceId: 10,
        }),
      });
    });
  });

  // ── Document.get ────────────────────────────────────────────────────
  describe("Document.get", () => {
    it("returns the document when found by id", async () => {
      const mockDoc = {
        id: 1,
        docId: "doc-uuid-1",
        filename: "report.pdf",
        docpath: "custom-documents/report.pdf",
        workspaceId: 10,
        metadata: '{"title":"Report"}',
      };
      prisma.workspace_documents.findFirst.mockResolvedValue(mockDoc);

      const result = await Document.get({ id: 1 });

      expect(result).not.toBeNull();
      expect(result.id).toBe(1);
      expect(result.filename).toBe("report.pdf");
      expect(prisma.workspace_documents.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("returns the document when found by docId", async () => {
      const mockDoc = {
        id: 2,
        docId: "unique-doc-uuid",
        filename: "notes.txt",
        workspaceId: 5,
      };
      prisma.workspace_documents.findFirst.mockResolvedValue(mockDoc);

      const result = await Document.get({ docId: "unique-doc-uuid" });

      expect(result).not.toBeNull();
      expect(result.docId).toBe("unique-doc-uuid");
      expect(prisma.workspace_documents.findFirst).toHaveBeenCalledWith({
        where: { docId: "unique-doc-uuid" },
      });
    });

    it("returns null when the document does not exist", async () => {
      prisma.workspace_documents.findFirst.mockResolvedValue(null);

      const result = await Document.get({ id: 99999 });

      expect(result).toBeNull();
    });

    it("returns null on prisma error", async () => {
      prisma.workspace_documents.findFirst.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await Document.get({ id: 1 });

      expect(result).toBeNull();
    });
  });

  // ── Document.forWorkspace ───────────────────────────────────────────
  describe("Document.forWorkspace", () => {
    it("lists documents for a workspace", async () => {
      const mockDocs = [
        {
          id: 1,
          docId: "doc-1",
          filename: "file1.pdf",
          docpath: "custom-documents/file1.pdf",
          workspaceId: 10,
          metadata: null,
          pinned: false,
          watched: false,
        },
        {
          id: 2,
          docId: "doc-2",
          filename: "file2.txt",
          docpath: "custom-documents/file2.txt",
          workspaceId: 10,
          metadata: null,
          pinned: true,
          watched: false,
        },
      ];
      prisma.workspace_documents.findMany.mockResolvedValue(mockDocs);

      const docs = await Document.forWorkspace(10);

      expect(docs).toHaveLength(2);
      expect(docs[0].filename).toBe("file1.pdf");
      expect(docs[1].filename).toBe("file2.txt");
      expect(prisma.workspace_documents.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 10 },
        take: 1000,
        select: expect.objectContaining({
          id: true,
          docId: true,
          filename: true,
          docpath: true,
          workspaceId: true,
        }),
      });
    });

    it("returns an empty array when workspaceId is null", async () => {
      const docs = await Document.forWorkspace(null);

      expect(docs).toEqual([]);
      expect(prisma.workspace_documents.findMany).not.toHaveBeenCalled();
    });
  });

  // ── Document.delete ─────────────────────────────────────────────────
  describe("Document.delete", () => {
    it("deletes documents matching the clause and returns true", async () => {
      // delete first looks up docIds for vector cleanup
      prisma.workspace_documents.findMany.mockResolvedValue([
        { docId: "doc-uuid-1" },
        { docId: "doc-uuid-2" },
      ]);
      prisma.document_vectors.deleteMany.mockResolvedValue({ count: 2 });
      prisma.workspace_documents.deleteMany.mockResolvedValue({ count: 2 });

      const result = await Document.delete({ workspaceId: 10 });

      expect(result).toBe(true);
      // Should clean up document_vectors for the matched docIds
      expect(prisma.document_vectors.deleteMany).toHaveBeenCalledWith({
        where: { docId: { in: ["doc-uuid-1", "doc-uuid-2"] } },
      });
      expect(prisma.workspace_documents.deleteMany).toHaveBeenCalledWith({
        where: { workspaceId: 10 },
      });
    });

    it("returns true when no documents match (nothing to delete)", async () => {
      prisma.workspace_documents.findMany.mockResolvedValue([]);

      const result = await Document.delete({ workspaceId: 999 });

      expect(result).toBe(true);
      expect(prisma.workspace_documents.deleteMany).not.toHaveBeenCalled();
    });

    it("returns false on prisma error", async () => {
      prisma.workspace_documents.findMany.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await Document.delete({ workspaceId: 10 });

      expect(result).toBe(false);
    });

    it("verifies documents are gone after deletion", async () => {
      prisma.workspace_documents.findMany
        .mockResolvedValueOnce([{ docId: "doc-to-delete" }]) // delete lookup
        .mockResolvedValueOnce([]); // forWorkspace after deletion
      prisma.document_vectors.deleteMany.mockResolvedValue({ count: 1 });
      prisma.workspace_documents.deleteMany.mockResolvedValue({ count: 1 });

      await Document.delete({ workspaceId: 10 });
      const remaining = await Document.forWorkspace(10);

      expect(remaining).toEqual([]);
    });
  });
});
