// SPDX-License-Identifier: MIT
// Purpose: Unit tests for vectorStore reset and DocumentManager (#386)
// Docs: tests/vectorStoreDocumentManager.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing modules under test.
vi.mock("../server/models/workspace", () => ({
  Workspace: {
    where: vi.fn(() => Promise.resolve([{ slug: "ws-1" }, { slug: "ws-2" }])),
  },
}));

vi.mock("../server/models/documents", () => ({
  Document: {
    delete: vi.fn(() => Promise.resolve(true)),
  },
}));

vi.mock("../server/models/vectors", () => ({
  DocumentVectors: {
    delete: vi.fn(() => Promise.resolve(true)),
  },
}));

vi.mock("../server/models/eventLogs", () => ({
  EventLogs: {
    logEvent: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../server/utils/files", () => ({
  purgeEntireVectorCache: vi.fn(),
}));

vi.mock("../server/utils/helpers", () => ({
  getVectorDbClass: vi.fn(() => {
    const instance = {
      "delete-namespace": vi.fn(() => Promise.resolve(true)),
      reset: vi.fn(() => Promise.resolve(true)),
    };
    return instance;
  }),
}));

vi.mock("../server/utils/logger/console.js", () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../server/utils/paths", () => ({
  getStoragePath: vi.fn((dir) => `/tmp/storage/${dir}`),
}));

vi.mock("fs", () => ({
  default: {
    readFileSync: vi.fn(),
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// resetAllVectorStores
// ---------------------------------------------------------------------------

import { resetAllVectorStores } from "../server/utils/vectorStore/resetAllVectorStores";
import { Workspace } from "../server/models/workspace";
import { Document } from "../server/models/documents";
import { DocumentVectors } from "../server/models/vectors";
import { EventLogs } from "../server/models/eventLogs";
import { purgeEntireVectorCache } from "../server/utils/files";
import { getVectorDbClass } from "../server/utils/helpers";

describe("resetAllVectorStores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should purge cache, delete vectors/documents, log event, and delete namespaces for non-pgvector", async () => {
    const result = await resetAllVectorStores({ vectorDbKey: "chroma" });

    expect(result).toBe(true);
    expect(Workspace.where).toHaveBeenCalledTimes(1);
    expect(purgeEntireVectorCache).toHaveBeenCalledTimes(1);
    expect(DocumentVectors.delete).toHaveBeenCalledTimes(1);
    expect(Document.delete).toHaveBeenCalledTimes(1);
    expect(EventLogs.logEvent).toHaveBeenCalledWith(
      "workspace_vectors_reset",
      { reason: "System vector configuration changed" },
    );

    const VectorDb = getVectorDbClass();
    // Two workspaces → two delete-namespace calls
    expect(VectorDb["delete-namespace"]).toHaveBeenCalledTimes(2);
    expect(VectorDb["delete-namespace"]).toHaveBeenCalledWith({ namespace: "ws-1" });
    expect(VectorDb["delete-namespace"]).toHaveBeenCalledWith({ namespace: "ws-2" });
  });

  it("should call VectorDb.reset() for pgvector instead of per-namespace delete", async () => {
    const result = await resetAllVectorStores({ vectorDbKey: "pgvector" });

    expect(result).toBe(true);
    const VectorDb = getVectorDbClass();
    expect(VectorDb.reset).toHaveBeenCalledTimes(1);
    expect(VectorDb["delete-namespace"]).not.toHaveBeenCalled();
  });

  it("should continue deleting other namespaces even if one fails", async () => {
    const VectorDb = getVectorDbClass();
    VectorDb["delete-namespace"]
      .mockRejectedValueOnce(new Error("namespace not found"))
      .mockResolvedValueOnce(true);

    const result = await resetAllVectorStores({ vectorDbKey: "chroma" });
    expect(result).toBe(true);
    expect(VectorDb["delete-namespace"]).toHaveBeenCalledTimes(2);
  });

  it("should return false when Workspace.where throws", async () => {
    Workspace.where.mockRejectedValueOnce(new Error("DB down"));
    const result = await resetAllVectorStores({ vectorDbKey: "chroma" });
    expect(result).toBe(false);
  });

  it("should return false when Document.delete throws", async () => {
    Document.delete.mockRejectedValueOnce(new Error("delete failed"));
    const result = await resetAllVectorStores({ vectorDbKey: "chroma" });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DocumentManager
// ---------------------------------------------------------------------------

import { DocumentManager } from "../server/utils/DocumentManager";

describe("DocumentManager", () => {
  let originalReadFileSync;

  beforeEach(() => {
    vi.clearAllMocks();
    originalReadFileSync = vi.mocked(require("fs").default.readFileSync);
  });

  describe("constructor", () => {
    it("should set workspace and default maxTokens to Infinity", () => {
      const dm = new DocumentManager({ workspace: { id: 1 } });
      expect(dm.workspace).toEqual({ id: 1 });
      expect(dm.maxTokens).toBe(Infinity);
    });

    it("should accept a custom maxTokens value", () => {
      const dm = new DocumentManager({ workspace: { id: 1 }, maxTokens: 5000 });
      expect(dm.maxTokens).toBe(5000);
    });

    it("should default workspace to null when not provided", () => {
      const dm = new DocumentManager({});
      expect(dm.workspace).toBeNull();
    });
  });

  describe("pinnedDocuments", () => {
    it("should return empty array when no workspace is set", async () => {
      const dm = new DocumentManager({});
      const docs = await dm.pinnedDocuments();
      expect(docs).toEqual([]);
    });
  });

  describe("pinnedDocs", () => {
    it("should return empty array when no workspace is set", async () => {
      const dm = new DocumentManager({});
      const docs = await dm.pinnedDocs();
      expect(docs).toEqual([]);
    });

    it("should load and return pinned documents with valid structure", async () => {
      const mockDoc = {
        pageContent: "This is document content with umläuts",
        token_count_estimate: 100,
      };
      originalReadFileSync.mockReturnValue(JSON.stringify(mockDoc));

      // Mock pinnedDocuments via workspace
      const { Document } = require("../server/models/documents");
      Document.where = vi.fn(() =>
        Promise.resolve([{ docpath: "doc1.json" }]),
      );

      const dm = new DocumentManager({ workspace: { id: 42 } });
      const docs = await dm.pinnedDocs();

      expect(docs).toHaveLength(1);
      expect(docs[0].pageContent).toBe("This is document content with umläuts");
      expect(docs[0].token_count_estimate).toBe(100);
    });

    it("should skip documents missing pageContent or token_count_estimate", async () => {
      originalReadFileSync
        .mockReturnValueOnce(JSON.stringify({ pageContent: "no tokens" }))
        .mockReturnValueOnce(JSON.stringify({ token_count_estimate: 50 }));

      const { Document } = require("../server/models/documents");
      Document.where = vi.fn(() =>
        Promise.resolve([{ docpath: "a.json" }, { docpath: "b.json" }]),
      );

      const dm = new DocumentManager({ workspace: { id: 1 } });
      const docs = await dm.pinnedDocs();
      expect(docs).toEqual([]);
    });

    it("should respect maxTokens limit and skip documents that exceed it", async () => {
      const doc1 = { pageContent: "doc1", token_count_estimate: 3000 };
      const doc2 = { pageContent: "doc2", token_count_estimate: 3000 };

      originalReadFileSync
        .mockReturnValueOnce(JSON.stringify(doc1))
        .mockReturnValueOnce(JSON.stringify(doc2));

      const { Document } = require("../server/models/documents");
      Document.where = vi.fn(() =>
        Promise.resolve([{ docpath: "d1.json" }, { docpath: "d2.json" }]),
      );

      const dm = new DocumentManager({ workspace: { id: 1 }, maxTokens: 5000 });
      const docs = await dm.pinnedDocs();

      // First doc fits (3000 < 5000), second would push to 6000 > 5000 → skipped
      expect(docs).toHaveLength(1);
      expect(docs[0].pageContent).toBe("doc1");
    });

    it("should handle file read errors gracefully and skip failing documents", async () => {
      originalReadFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const { Document } = require("../server/models/documents");
      Document.where = vi.fn(() =>
        Promise.resolve([{ docpath: "missing.json" }]),
      );

      const dm = new DocumentManager({ workspace: { id: 1 } });
      const docs = await dm.pinnedDocs();
      expect(docs).toEqual([]);
    });
  });

  describe("loadPinnedDocument", () => {
    it("should return parsed document data when file has valid structure", async () => {
      const mockData = {
        pageContent: "Test content",
        token_count_estimate: 42,
      };
      originalReadFileSync.mockReturnValue(JSON.stringify(mockData));

      const dm = new DocumentManager({ workspace: { id: 1 } });
      const result = await dm.loadPinnedDocument("test.json");

      expect(result).toEqual(mockData);
    });

    it("should return null when pageContent is missing", async () => {
      originalReadFileSync.mockReturnValue(
        JSON.stringify({ token_count_estimate: 42 }),
      );

      const dm = new DocumentManager({ workspace: { id: 1 } });
      const result = await dm.loadPinnedDocument("test.json");
      expect(result).toBeNull();
    });

    it("should return null when token_count_estimate is missing", async () => {
      originalReadFileSync.mockReturnValue(
        JSON.stringify({ pageContent: "hello" }),
      );

      const dm = new DocumentManager({ workspace: { id: 1 } });
      const result = await dm.loadPinnedDocument("test.json");
      expect(result).toBeNull();
    });
  });
});
