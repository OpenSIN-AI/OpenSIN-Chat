// SPDX-License-Identifier: MIT
jest.mock("../../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../../utils/middleware/simpleRateLimit", () => ({
  simpleRateLimit: () => (_req, _res, next) => next(),
}));
jest.mock("../../../utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: () => (_req, _res, next) => next(),
  ROLES: { admin: "admin", manager: "manager", default: "default" },
}));
jest.mock("../../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const { createMockApp } = require("../../helpers/mockExpressApp");
const { apiEnhancePromptEndpoints } = require("../../../endpoints/api/enhancePrompt");

function buildApp() {
  const harness = createMockApp();
  apiEnhancePromptEndpoints(harness.app);
  return harness;
}

describe("Enhance Prompt endpoint", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe("POST /enhance-prompt validation", () => {
    it("rejects a missing prompt with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", { body: {} });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/prompt is required/);
    });

    it("rejects a blank prompt with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "   " },
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects a non-string prompt with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: 42 },
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects an overlong prompt with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "x".repeat(5001) },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/5000 characters/);
    });

    it("rejects an overlong context with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "test", context: "x".repeat(2001) },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/context/);
    });
  });

  describe("POST /enhance-prompt with LLM", () => {
    it("returns the enhanced prompt from the LLM", async () => {
      const mockGetChatCompletion = jest
        .fn()
        .mockResolvedValue("What are the key energy policy differences between parties?");
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "energie politik" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.originalPrompt).toBe("energie politik");
      expect(res.body.enhancedPrompt).toBe(
        "What are the key energy policy differences between parties?",
      );
      expect(mockGetChatCompletion).toHaveBeenCalledTimes(1);
      const [messages] = mockGetChatCompletion.mock.calls[0];
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
      expect(messages[1].content).toContain("energie politik");
    });

    it("includes context in the LLM prompt when provided", async () => {
      const mockGetChatCompletion = jest.fn().mockResolvedValue("Enhanced");
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      await call("post", "/enhance-prompt", {
        body: { prompt: "test", context: "climate change" },
      });

      const [messages] = mockGetChatCompletion.mock.calls[0];
      expect(messages[1].content).toContain("climate change");
      expect(messages[1].content).toContain("test");
    });

    it("handles LLM returning { textResponse } object", async () => {
      const mockGetChatCompletion = jest
        .fn()
        .mockResolvedValue({ textResponse: "  Improved prompt  " });
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "test" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.enhancedPrompt).toBe("Improved prompt");
    });

    it("falls back to original when LLM returns empty", async () => {
      const mockGetChatCompletion = jest.fn().mockResolvedValue("   ");
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "test" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.enhancedPrompt).toBe("test");
      expect(res.body.note).toMatch(/empty response/);
    });

    it("returns 500 when LLM throws", async () => {
      const mockGetChatCompletion = jest
        .fn()
        .mockRejectedValue(new Error("LLM down"));
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "test" },
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Internal Server Error");
    });
  });

  describe("POST /enhance-prompt fallback (no LLM)", () => {
    it("returns original prompt with note when getLLMProvider throws", async () => {
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => {
          throw new Error("No LLM_PROVIDER configured");
        },
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "my prompt" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.enhancedPrompt).toBe("my prompt");
      expect(res.body.originalPrompt).toBe("my prompt");
      expect(res.body.note).toMatch(/No LLM provider configured/);
    });
  });
});
