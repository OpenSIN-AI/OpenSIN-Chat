// SPDX-License-Identifier: MIT
// Tests for EmbeddingEngines (Issue #385).
//
// Covers: OpenAiEmbedder — constructor with/without API key,
// embedChunks happy path, error handling, timeout, and
// NativeEmbedder — model selection, prefix properties, availableModels.

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

jest.mock("../../utils/helpers", () => ({
  toChunks: (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  },
  reportEmbeddingProgress: jest.fn(),
}));

jest.mock("../../utils/paths", () => ({
  getStoragePath: (...parts) => "/tmp/fake-storage/" + parts.join("/"),
}));

// ─────────────────────────────────────────────────────────────────────────────
// OpenAiEmbedder tests
// ─────────────────────────────────────────────────────────────────────────────
const mockOpenAIEmbeddings = {
  create: jest.fn(),
};
jest.mock("openai", () => ({
  OpenAI: jest.fn(() => ({ embeddings: mockOpenAIEmbeddings })),
}));

const { OpenAiEmbedder } = require("../../utils/EmbeddingEngines/openAi");

describe("OpenAiEmbedder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPEN_AI_KEY = "test-key-123";
    process.env.EMBEDDING_MODEL_PREF = "text-embedding-ada-002";
  });

  afterEach(() => {
    delete process.env.OPEN_AI_KEY;
    delete process.env.EMBEDDING_MODEL_PREF;
  });

  describe("constructor", () => {
    it("initializes with API key and default model", () => {
      const embedder = new OpenAiEmbedder();
      expect(embedder.className).toBe("OpenAiEmbedder");
      expect(embedder.model).toBe("text-embedding-ada-002");
      expect(embedder.maxConcurrentChunks).toBe(500);
      expect(embedder.embeddingMaxChunkLength).toBe(8191);
    });

    it("throws when OPEN_AI_KEY is not set", () => {
      delete process.env.OPEN_AI_KEY;
      expect(() => new OpenAiEmbedder()).toThrow("No OpenAI API key was set.");
    });

    it("uses EMBEDDING_MODEL_PREF when set", () => {
      process.env.EMBEDDING_MODEL_PREF = "text-embedding-3-small";
      const embedder = new OpenAiEmbedder();
      expect(embedder.model).toBe("text-embedding-3-small");
    });
  });

  describe("embedChunks", () => {
    it("embeds text chunks successfully", async () => {
      const fakeEmbeddings = [
        { embedding: [0.1, 0.2, 0.3] },
        { embedding: [0.4, 0.5, 0.6] },
      ];
      mockOpenAIEmbeddings.create.mockResolvedValue({ data: fakeEmbeddings });

      const embedder = new OpenAiEmbedder();
      const result = await embedder.embedChunks(["hello", "world"]);

      expect(result).toEqual([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ]);
      expect(mockOpenAIEmbeddings.create).toHaveBeenCalledWith({
        model: "text-embedding-ada-002",
        input: ["hello", "world"],
      });
    });

    it("throws on API error", async () => {
      mockOpenAIEmbeddings.create.mockRejectedValue({
        response: { data: { error: { code: "rate_limit", message: "Too many requests" } } },
        message: "Request failed",
      });

      const embedder = new OpenAiEmbedder();
      await expect(embedder.embedChunks(["text"])).rejects.toThrow(
        /OpenAI Failed to embed/,
      );
    });

    it("handles empty input array", async () => {
      mockOpenAIEmbeddings.create.mockResolvedValue({ data: [] });

      const embedder = new OpenAiEmbedder();
      const result = await embedder.embedChunks([]);

      expect(result).toBeNull();
    });

    it("embeds large input in batches", async () => {
      // Create 600 chunks to exceed maxConcurrentChunks (500)
      const texts = Array.from({ length: 600 }, (_, i) => `text-${i}`);
      const fakeData = texts.map(() => ({ embedding: [0.1, 0.2] }));
      mockOpenAIEmbeddings.create
        .mockResolvedValueOnce({ data: fakeData.slice(0, 500) })
        .mockResolvedValueOnce({ data: fakeData.slice(500) });

      const embedder = new OpenAiEmbedder();
      const result = await embedder.embedChunks(texts);

      expect(result).toHaveLength(600);
      expect(mockOpenAIEmbeddings.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("embedTextInput", () => {
    it("embeds a single text input and returns first embedding", async () => {
      mockOpenAIEmbeddings.create.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      });

      const embedder = new OpenAiEmbedder();
      const result = await embedder.embedTextInput("hello");

      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it("handles array input for embedTextInput", async () => {
      mockOpenAIEmbeddings.create.mockResolvedValue({
        data: [
          { embedding: [0.1, 0.2] },
          { embedding: [0.3, 0.4] },
        ],
      });

      const embedder = new OpenAiEmbedder();
      const result = await embedder.embedTextInput(["a", "b"]);

      expect(result).toEqual([0.1, 0.2]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NativeEmbedder tests
// ─────────────────────────────────────────────────────────────────────────────
jest.mock("../../utils/EmbeddingEngines/native/constants", () => ({
  SUPPORTED_NATIVE_EMBEDDING_MODELS: {
    "Xenova/all-MiniLM-L6-v2": {
      chunkPrefix: "",
      queryPrefix: "",
      maxConcurrentChunks: 250,
      embeddingMaxChunkLength: 512,
      apiInfo: {
        id: "Xenova/all-MiniLM-L6-v2",
        name: "all-MiniLM-L6-v2",
        description: "Small and fast",
        lang: "en",
        size: "23MB",
        modelCard: "https://huggingface.co/Xenova/all-MiniLM-L6-v2",
      },
    },
    "Xenova/nomic-embed-text-v1": {
      chunkPrefix: "search_document:",
      queryPrefix: "search_query:",
      maxConcurrentChunks: 100,
      embeddingMaxChunkLength: 8192,
      apiInfo: {
        id: "Xenova/nomic-embed-text-v1",
        name: "nomic-embed-text-v1",
        description: "Long context",
        lang: "en",
        size: "272MB",
        modelCard: "https://huggingface.co/Xenova/nomic-embed-text-v1",
      },
    },
  },
}));

jest.mock("uuid", () => ({ v4: () => "fake-uuid" }));

const { NativeEmbedder } = require("../../utils/EmbeddingEngines/native");

describe("NativeEmbedder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EMBEDDING_MODEL_PREF;
  });

  describe("constructor", () => {
    it("initializes with default model", () => {
      const embedder = new NativeEmbedder();
      expect(embedder.className).toBe("NativeEmbedder");
      expect(embedder.model).toBe("Xenova/all-MiniLM-L6-v2");
    });

    it("uses model from EMBEDDING_MODEL_PREF when supported", () => {
      process.env.EMBEDDING_MODEL_PREF = "Xenova/nomic-embed-text-v1";
      const embedder = new NativeEmbedder();
      expect(embedder.model).toBe("Xenova/nomic-embed-text-v1");
    });

    it("falls back to default when EMBEDDING_MODEL_PREF is unsupported", () => {
      process.env.EMBEDDING_MODEL_PREF = "unsupported/model";
      const embedder = new NativeEmbedder();
      expect(embedder.model).toBe("Xenova/all-MiniLM-L6-v2");
    });
  });

  describe("availableModels", () => {
    it("returns list of supported models", () => {
      const models = NativeEmbedder.availableModels();
      expect(models).toHaveLength(2);
      expect(models[0]).toHaveProperty("id");
      expect(models[0]).toHaveProperty("name");
    });
  });

  describe("embeddingPrefix / queryPrefix", () => {
    it("returns empty prefix for MiniLM model", () => {
      const embedder = new NativeEmbedder();
      expect(embedder.embeddingPrefix).toBe("");
      expect(embedder.queryPrefix).toBe("");
    });

    it("returns correct prefixes for nomic model", () => {
      process.env.EMBEDDING_MODEL_PREF = "Xenova/nomic-embed-text-v1";
      const embedder = new NativeEmbedder();
      expect(embedder.embeddingPrefix).toBe("search_document:");
      expect(embedder.queryPrefix).toBe("search_query:");
    });
  });

  describe("getEmbedderInfo", () => {
    it("returns model info object", () => {
      const embedder = new NativeEmbedder();
      const info = embedder.getEmbedderInfo();
      expect(info).toHaveProperty("maxConcurrentChunks");
      expect(info).toHaveProperty("embeddingMaxChunkLength");
    });
  });
});
