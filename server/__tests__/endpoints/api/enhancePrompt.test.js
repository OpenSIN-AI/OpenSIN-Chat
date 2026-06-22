// SPDX-License-Identifier: MIT
// Purpose: Unit tests for POST /api/enhance-prompt
// Docs: server/__tests__/endpoints/api/enhancePrompt.test.js

jest.mock("../../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
  validAdminApiKey: (_req, _res, next) => next(),
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

    it("rejects a string body that cannot be parsed as JSON with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: "application/x-www-form-urlencoded text",
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/prompt is required/);
    });

    it("ignores extra JSON fields", async () => {
      const mockGetChatCompletion = jest.fn().mockResolvedValue("Enhanced");
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "test", extra: "ignore", foo: "bar" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.enhancedPrompt).toBe("Enhanced");
      expect(res.body.originalPrompt).toBe("test");
    });

    it("accepts HTML-like prompt content without crashing", async () => {
      const mockGetChatCompletion = jest
        .fn()
        .mockResolvedValue("Enhanced HTML prompt");
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "test <b>html</b>" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.enhancedPrompt).toBe("Enhanced HTML prompt");
    });

    it("accepts shell-like prompt content without crashing", async () => {
      const mockGetChatCompletion = jest.fn().mockResolvedValue("Enhanced shell prompt");
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "$(whoami)" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.enhancedPrompt).toBe("Enhanced shell prompt");
    });

    it("accepts 'environment variables' prompt content without crashing", async () => {
      const mockGetChatCompletion = jest.fn().mockResolvedValue("Enhanced env prompt");
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "environment variables" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.enhancedPrompt).toBe("Enhanced env prompt");
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
      expect(res.body.note).toMatch(/empty or unparseable response/);
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

    it("strips plain-text reasoning prefix from the LLM response", async () => {
      const mockGetChatCompletion = jest.fn().mockResolvedValue(
        "The user wants me to enhance the prompt.\n\nWhat are the key differences between the parties?",
      );
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "parties" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.enhancedPrompt).toBe(
        "What are the key differences between the parties?",
      );
      expect(res.body.enhancedPrompt).not.toMatch(/The user wants me to/);
    });

    it("strips reasoning in the same paragraph as the answer", async () => {
      const mockGetChatCompletion = jest.fn().mockResolvedValue(
        "The user wants me to enhance the prompt. What are the key differences between the parties?",
      );
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "parties" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.enhancedPrompt).toBe(
        "What are the key differences between the parties?",
      );
      expect(res.body.enhancedPrompt).not.toMatch(/The user wants me to/);
    });

    it("extracts the prompt from <enhanced_prompt> tags when the model follows the format", async () => {
      const mockGetChatCompletion = jest.fn().mockResolvedValue(
        "Some reasoning here.\n\n<enhanced_prompt>\nWhat are the key differences between the parties?\n</enhanced_prompt>",
      );
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "parties" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.enhancedPrompt).toBe(
        "What are the key differences between the parties?",
      );
      expect(res.body.enhancedPrompt).not.toMatch(/reasoning/);
      expect(res.body.enhancedPrompt).not.toMatch(/<enhanced_prompt>/);
    });

    it("strips <thinking> reasoning tags from the LLM response", async () => {
      const mockGetChatCompletion = jest.fn().mockResolvedValue(
        "<thinking>The user wants me to enhance this.</thinking>\nWhat are the key differences between the parties?",
      );
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "parties" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.enhancedPrompt).toBe(
        "What are the key differences between the parties?",
      );
      expect(res.body.enhancedPrompt).not.toMatch(/thinking/);
    });

    it("falls back to the original prompt when the response is only reasoning", async () => {
      const mockGetChatCompletion = jest.fn().mockResolvedValue(
        "The user wants me to enhance the prompt.",
      );
      jest.doMock("../../../utils/helpers", () => ({
        getLLMProvider: () => ({
          getChatCompletion: mockGetChatCompletion,
        }),
      }));

      const { call } = buildApp();
      const res = await call("post", "/enhance-prompt", {
        body: { prompt: "parties" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.enhancedPrompt).toBe("parties");
      expect(res.body.note).toMatch(/empty or unparseable response/);
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
