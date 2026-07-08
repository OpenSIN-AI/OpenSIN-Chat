// SPDX-License-Identifier: MIT
// Tests for EmbeddingRerankers (Issue #385).
//
// Covers: NativeEmbeddingReranker — constructor, host property,
// preload, rerank happy path, and error handling.

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

jest.mock("../../utils/paths", () => ({
  getStoragePath: (...parts) => "/tmp/fake-storage/" + parts.join("/"),
}));

// Mock fs
jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

// Shared mock objects — defined before jest.mock() factories so the
// factory closures can reference them.  jest.mock() is hoisted above
// the variable declarations, so we use `let` + re-assign in beforeEach.
const mockAutoModel = {
  from_pretrained: jest.fn(),
};
const mockAutoTokenizer = jest.fn(() => {
  return jest.fn((queries, opts) => ({
    input_ids: [[1, 2, 3]],
    attention_mask: [[1, 1, 1]],
    ...opts,
  }));
});
const mockEnv = {
  remoteHost: "https://huggingface.co",
  remotePathTemplate: "{model}/{file}",
};

// The production code does `await import("@huggingface/transformers")` — mock
// it so the Jest sandbox never tries to load the real native ONNX binaries.
jest.mock("@huggingface/transformers", () => ({
  AutoModelForSequenceClassification: mockAutoModel,
  AutoTokenizer: mockAutoTokenizer,
  env: mockEnv,
}));

const { NativeEmbeddingReranker } = require("../../utils/EmbeddingRerankers/native");

describe("NativeEmbeddingReranker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset static private fields between tests via re-require
    jest.resetModules();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Constructor
  // ─────────────────────────────────────────────────────────────────────────
  describe("constructor", () => {
    it("initializes with default model", () => {
      const reranker = new NativeEmbeddingReranker();
      expect(reranker.model).toBe("Xenova/ms-marco-MiniLM-L-6-v2");
      expect(reranker.modelDownloaded).toBe(true); // fs.existsSync mocked to true
    });

    it("sets cacheDir and modelPath", () => {
      const reranker = new NativeEmbeddingReranker();
      expect(reranker.cacheDir).toContain("models");
      expect(reranker.modelPath).toContain("Xenova");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // host property
  // ─────────────────────────────────────────────────────────────────────────
  describe("host", () => {
    it("returns huggingface.co when transformers not initialized", () => {
      const reranker = new NativeEmbeddingReranker();
      expect(reranker.host).toBe("huggingface.co");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // preload
  // ─────────────────────────────────────────────────────────────────────────
  describe("preload", () => {
    it("calls initClient without throwing", async () => {
      const { NativeEmbeddingReranker: FreshReranker } = require("../../utils/EmbeddingRerankers/native");
      mockAutoModel.from_pretrained.mockResolvedValue({
        sigmoid: () => ({ tolist: () => [[0.9]] }),
      });

      const reranker = new FreshReranker();
      // preload should not throw even if init fails
      await expect(reranker.preload()).resolves.not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // rerank
  // ─────────────────────────────────────────────────────────────────────────
  describe("rerank", () => {
    it("reranks documents and returns top-K sorted by score", async () => {
      const { NativeEmbeddingReranker: FreshReranker } = require("../../utils/EmbeddingRerankers/native");

      // Mock the model and tokenizer
      const mockModel = {
        sigmoid: () => ({
          tolist: () => [
            [0.3],
            [0.9],
            [0.5],
          ],
        }),
      };
      mockAutoModel.from_pretrained.mockResolvedValue(mockModel);

      const mockTokenizerFn = jest.fn(() => ({
        input_ids: [[1, 2, 3]],
        attention_mask: [[1, 1, 1]],
      }));
      mockAutoTokenizer.mockReturnValue(mockTokenizerFn);

      const reranker = new FreshReranker();
      const documents = [
        { text: "doc 1" },
        { text: "doc 2" },
        { text: "doc 3" },
      ];

      const result = await reranker.rerank("query", documents, { topK: 2 });

      expect(result).toHaveLength(2);
      // Highest score (0.9) should be first
      expect(result[0].rerank_score).toBe(0.9);
      expect(result[0].text).toBe("doc 2");
      // Second highest (0.5)
      expect(result[1].rerank_score).toBe(0.5);
      expect(result[1].text).toBe("doc 3");
      // Each result should have rerank_corpus_id
      expect(result[0].rerank_corpus_id).toBeDefined();
    });

    it("respects topK option", async () => {
      const { NativeEmbeddingReranker: FreshReranker } = require("../../utils/EmbeddingRerankers/native");

      const mockModel = {
        sigmoid: () => ({
          tolist: () => [[0.1], [0.8], [0.3], [0.6]],
        }),
      };
      mockAutoModel.from_pretrained.mockResolvedValue(mockModel);
      mockAutoTokenizer.mockReturnValue(jest.fn(() => ({ input_ids: [[1]], attention_mask: [[1]] })));

      const reranker = new FreshReranker();
      const documents = [
        { text: "a" },
        { text: "b" },
        { text: "c" },
        { text: "d" },
      ];

      const result = await reranker.rerank("query", documents, { topK: 3 });
      expect(result).toHaveLength(3);
    });

    it("handles single document rerank", async () => {
      const { NativeEmbeddingReranker: FreshReranker } = require("../../utils/EmbeddingRerankers/native");

      const mockModel = {
        sigmoid: () => ({ tolist: () => [[0.7]] }),
      };
      mockAutoModel.from_pretrained.mockResolvedValue(mockModel);
      mockAutoTokenizer.mockReturnValue(jest.fn(() => ({ input_ids: [[1]], attention_mask: [[1]] })));

      const reranker = new FreshReranker();
      const result = await reranker.rerank("query", [{ text: "only doc" }], { topK: 4 });

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("only doc");
      expect(result[0].rerank_score).toBe(0.7);
    });

    it("preserves original document properties in results", async () => {
      const { NativeEmbeddingReranker: FreshReranker } = require("../../utils/EmbeddingRerankers/native");

      const mockModel = {
        sigmoid: () => ({ tolist: () => [[0.5]] }),
      };
      mockAutoModel.from_pretrained.mockResolvedValue(mockModel);
      mockAutoTokenizer.mockReturnValue(jest.fn(() => ({ input_ids: [[1]], attention_mask: [[1]] })));

      const reranker = new FreshReranker();
      const doc = { text: "content", id: "doc-42", metadata: { page: 1 } };
      const result = await reranker.rerank("query", [doc], { topK: 1 });

      expect(result[0].id).toBe("doc-42");
      expect(result[0].metadata).toEqual({ page: 1 });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Error paths
  // ─────────────────────────────────────────────────────────────────────────
  describe("error handling", () => {
    it("preload does not throw when initClient fails", async () => {
      const { NativeEmbeddingReranker: FreshReranker } = require("../../utils/EmbeddingRerankers/native");
      mockAutoModel.from_pretrained.mockRejectedValue(new Error("Network error"));

      const reranker = new FreshReranker();
      await expect(reranker.preload()).resolves.not.toThrow();
    });

    it("rerank throws when model fails to load", async () => {
      const { NativeEmbeddingReranker: FreshReranker } = require("../../utils/EmbeddingRerankers/native");
      mockAutoModel.from_pretrained.mockRejectedValue(new Error("Model load failed"));

      const reranker = new FreshReranker();
      await expect(
        reranker.rerank("query", [{ text: "doc" }], { topK: 1 }),
      ).rejects.toThrow();
    });
  });
});
