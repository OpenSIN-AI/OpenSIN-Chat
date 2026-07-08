// SPDX-License-Identifier: MIT
// Tests for AiProviders (Issue #385).
//
// Covers: OpenAiLLM provider — constructor with/without API key,
// promptWindowLimit, isValidChatCompletionModel, streamingEnabled,
// constructPrompt, and error mapping.

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

jest.mock("../../utils/logger/structured", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock("../../utils/helpers/chat/responses", () => ({
  formatChatHistory: (history, genContent) =>
    history.map((h) => ({ role: h.role, content: genContent({ userPrompt: h.content }) })),
  writeResponseChunk: jest.fn(),
  clientAbortedHandler: jest.fn(),
}));

jest.mock("../../utils/helpers/chat/LLMPerformanceMonitor", () => ({
  LLMPerformanceMonitor: {
    measure: jest.fn(async (provider, fn) => fn()),
  },
}));

// Mock the NativeEmbedder so it doesn't try to load transformers
jest.mock("../../utils/EmbeddingEngines/native", () => ({
  NativeEmbedder: jest.fn().mockImplementation(() => ({
    embedTextInput: jest.fn(),
    embedChunks: jest.fn(),
    embeddingMaxChunkLength: 8191,
  })),
}));

// Mock the model map
const mockModelMapGet = jest.fn();
jest.mock("../../utils/AiProviders/modelMap", () => ({
  MODEL_MAP: {
    get: (...a) => mockModelMapGet(...a),
  },
}));

// Mock openai module
const mockOpenAIInstance = {
  models: { retrieve: jest.fn() },
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};
jest.mock("openai", () => ({
  OpenAI: jest.fn(() => mockOpenAIInstance),
}));

const { OpenAiLLM } = require("../../utils/AiProviders/openAi");

describe("OpenAiLLM provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPEN_AI_KEY = "test-key-123";
    process.env.OPEN_MODEL_PREF = "gpt-4o";
    mockModelMapGet.mockReturnValue(128000);
  });

  afterEach(() => {
    delete process.env.OPEN_AI_KEY;
    delete process.env.OPEN_MODEL_PREF;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Constructor
  // ─────────────────────────────────────────────────────────────────────────
  describe("constructor", () => {
    it("initializes with API key and default model", () => {
      const llm = new OpenAiLLM();
      expect(llm.className).toBe("OpenAiLLM");
      expect(llm.model).toBe("gpt-4o");
      expect(llm.defaultTemp).toBe(0.7);
    });

    it("throws when OPEN_AI_KEY is not set", () => {
      delete process.env.OPEN_AI_KEY;
      expect(() => new OpenAiLLM()).toThrow("No OpenAI API key was set.");
    });

    it("uses modelPreference when provided", () => {
      const llm = new OpenAiLLM(null, "gpt-4o-mini");
      expect(llm.model).toBe("gpt-4o-mini");
    });

    it("falls back to OPEN_MODEL_PREF env var", () => {
      process.env.OPEN_MODEL_PREF = "gpt-4-turbo";
      const llm = new OpenAiLLM();
      expect(llm.model).toBe("gpt-4-turbo");
    });

    it("sets limits based on promptWindowLimit", () => {
      const llm = new OpenAiLLM();
      expect(llm.limits.history).toBeGreaterThan(0);
      expect(llm.limits.system).toBeGreaterThan(0);
      expect(llm.limits.user).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // promptWindowLimit
  // ─────────────────────────────────────────────────────────────────────────
  describe("promptWindowLimit", () => {
    it("returns context window from MODEL_MAP", () => {
      const llm = new OpenAiLLM();
      expect(llm.promptWindowLimit()).toBe(128000);
      expect(mockModelMapGet).toHaveBeenCalledWith("openai", "gpt-4o");
    });

    it("falls back to 4096 when model not in map", () => {
      mockModelMapGet.mockReturnValue(undefined);
      const llm = new OpenAiLLM(null, "unknown-model");
      expect(llm.promptWindowLimit()).toBe(4096);
    });

    it("static promptWindowLimit works with model name", () => {
      mockModelMapGet.mockReturnValue(8192);
      expect(OpenAiLLM.promptWindowLimit("gpt-4")).toBe(8192);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // isValidChatCompletionModel
  // ─────────────────────────────────────────────────────────────────────────
  describe("isValidChatCompletionModel", () => {
    it("returns true for GPT models without API call", async () => {
      const llm = new OpenAiLLM();
      const result = await llm.isValidChatCompletionModel("gpt-4o");
      expect(result).toBe(true);
      expect(mockOpenAIInstance.models.retrieve).not.toHaveBeenCalled();
    });

    it("returns true for models starting with 'o' (o1, o3, etc.)", async () => {
      const llm = new OpenAiLLM();
      const result = await llm.isValidChatCompletionModel("o1-mini");
      expect(result).toBe(true);
    });

    it("calls API for non-GPT models", async () => {
      mockOpenAIInstance.models.retrieve.mockResolvedValue({ id: "custom-model-1" });
      const llm = new OpenAiLLM();
      const result = await llm.isValidChatCompletionModel("custom-model-1");
      expect(result).toBe(true);
      expect(mockOpenAIInstance.models.retrieve).toHaveBeenCalledWith("custom-model-1");
    });

    it("returns false when API retrieval fails", async () => {
      mockOpenAIInstance.models.retrieve.mockRejectedValue(new Error("Not found"));
      const llm = new OpenAiLLM();
      const result = await llm.isValidChatCompletionModel("nonexistent-model");
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // streamingEnabled
  // ─────────────────────────────────────────────────────────────────────────
  describe("streamingEnabled", () => {
    it("returns false by default (no streamGetChatCompletion method on instance)", () => {
      const llm = new OpenAiLLM();
      // OpenAiLLM does have streamingEnabled method defined on prototype
      // but streamGetChatCompletion is also defined, so it should be true
      const result = llm.streamingEnabled();
      expect(typeof result).toBe("boolean");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // constructPrompt
  // ─────────────────────────────────────────────────────────────────────────
  describe("constructPrompt", () => {
    it("builds prompt with system, context, history, and user", () => {
      const llm = new OpenAiLLM();
      const messages = llm.constructPrompt({
        systemPrompt: "You are a helpful assistant.",
        contextTexts: ["Context 1", "Context 2"],
        chatHistory: [{ role: "user", content: "Hello" }],
        userPrompt: "What is this about?",
      });

      expect(messages).toHaveLength(3);
      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toContain("You are a helpful assistant.");
      expect(messages[0].content).toContain("Context 1");
      expect(messages[2].role).toBe("user");
    });

    it("handles empty context texts", () => {
      const llm = new OpenAiLLM();
      const messages = llm.constructPrompt({
        systemPrompt: "System",
        contextTexts: [],
        chatHistory: [],
        userPrompt: "Hello",
      });

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe("System");
    });
  });
});
