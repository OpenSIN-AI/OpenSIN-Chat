// SPDX-License-Identifier: MIT
// Additional tests for getCustomModels and SUPPORT_CUSTOM_MODELS.
//
// These tests use `jest.spyOn` (NOT jest.mock factory) on provider module
// exports. Because customModels.js captures the provider functions via
// destructuring `const { fetchOpenRouterModels } = require(...)` at module
// load, we wrap each test in `jest.isolateModules` so the spy is applied
// BEFORE the inner `require` of customModels picks up the spied reference.

describe("getCustomModels — additional coverage (with jest.spyOn)", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("perplexity provider", () => {
    it("returns known perplexity models from static catalog", async () => {
      let result;
      jest.isolateModules(() => {
        const perplexity = require("../../../utils/AiProviders/perplexity");
        jest.spyOn(perplexity, "perplexityModels").mockReturnValue({
          "llama-3-sonar-large-32k-online": {
            id: "llama-3-sonar-large-32k-online",
            name: "Sonar 32K Online",
          },
        });
        const { getCustomModels } = require("../../../utils/helpers/customModels");
        result = getCustomModels("perplexity");
      });
      const r = await result;
      expect(r.error).toBeNull();
      expect(Array.isArray(r.models)).toBe(true);
      expect(r.models).toHaveLength(1);
      expect(r.models[0]).toEqual({
        id: "llama-3-sonar-large-32k-online",
        name: "Sonar 32K Online",
      });
    });

    it("returns empty models array when static catalog is empty", async () => {
      let result;
      jest.isolateModules(() => {
        const perplexity = require("../../../utils/AiProviders/perplexity");
        jest.spyOn(perplexity, "perplexityModels").mockReturnValue({});
        const { getCustomModels } = require("../../../utils/helpers/customModels");
        result = getCustomModels("perplexity");
      });
      const r = await result;
      expect(r.models).toEqual([]);
      expect(r.error).toBeNull();
    });
  });

  describe("openrouter provider", () => {
    it("returns transformed openrouter models", async () => {
      let result;
      jest.isolateModules(() => {
        const openRouter = require("../../../utils/AiProviders/openRouter");
        jest.spyOn(openRouter, "fetchOpenRouterModels").mockResolvedValue({
          "openrouter/auto": {
            id: "openrouter/auto",
            name: "Auto",
            organization: "OpenRouter",
          },
        });
        const { getCustomModels } = require("../../../utils/helpers/customModels");
        result = getCustomModels("openrouter");
      });
      const r = await result;
      expect(r.error).toBeNull();
      expect(r.models).toHaveLength(1);
      expect(r.models[0].id).toBe("openrouter/auto");
      expect(r.models[0].organization).toBe("OpenRouter");
      expect(r.models[0].name).toBe("Auto");
    });

    it("returns empty array when openrouter returns no models", async () => {
      let result;
      jest.isolateModules(() => {
        const openRouter = require("../../../utils/AiProviders/openRouter");
        jest.spyOn(openRouter, "fetchOpenRouterModels").mockResolvedValue({});
        const { getCustomModels } = require("../../../utils/helpers/customModels");
        result = getCustomModels("openrouter");
      });
      const r = await result;
      expect(r.models).toEqual([]);
      expect(r.error).toBeNull();
    });
  });

  describe("fireworksai provider", () => {
    it("returns fireworks AI model list and forwards apiKey", async () => {
      let result;
      let apiKeyArg;
      jest.isolateModules(() => {
        const fireworksAi = require("../../../utils/AiProviders/fireworksAi");
        const spy = jest
          .spyOn(fireworksAi, "fireworksAiModels")
          .mockImplementation((key) => {
            apiKeyArg = key;
            return Promise.resolve({
              "accounts/fireworks/models/llama-v3-70b": {
                id: "accounts/fireworks/models/llama-v3-70b",
                organization: "Meta",
                name: "Llama v3 70B",
              },
            });
          });
        const { getCustomModels } = require("../../../utils/helpers/customModels");
        result = getCustomModels("fireworksai", "test-key");
      });
      const r = await result;
      expect(r.error).toBeNull();
      expect(r.models).toHaveLength(1);
      expect(r.models[0].id).toBe("accounts/fireworks/models/llama-v3-70b");
      expect(apiKeyArg).toBe("test-key");
    });

    it("returns empty list when fireworksAiModels returns empty", async () => {
      let result;
      jest.isolateModules(() => {
        const fireworksAi = require("../../../utils/AiProviders/fireworksAi");
        jest.spyOn(fireworksAi, "fireworksAiModels").mockResolvedValue({});
        const { getCustomModels } = require("../../../utils/helpers/customModels");
        result = getCustomModels("fireworksai", "test-key");
      });
      const r = await result;
      expect(r.models).toEqual([]);
      expect(r.error).toBeNull();
    });
  });

  describe("apipie provider", () => {
    it("filters and returns only chat subtypes", async () => {
      let result;
      let apiKeyArg;
      jest.isolateModules(() => {
        const apipie = require("../../../utils/AiProviders/apipie");
        jest.spyOn(apipie, "fetchApiPieModels").mockImplementation((key) => {
          apiKeyArg = key;
          return Promise.resolve({
            chatModel: {
              id: "chat-model",
              organization: "apipie",
              name: "Chat Model",
              subtype: "chat",
            },
            chatxModel: {
              id: "chatx-model",
              organization: "apipie",
              name: "ChatX Model",
              subtype: "chatx",
            },
            embedModel: {
              id: "embed-model",
              organization: "apipie",
              name: "Embed Model",
              subtype: "embed",
            },
          });
        });
        const { getCustomModels } = require("../../../utils/helpers/customModels");
        result = getCustomModels("apipie", "apipie-key");
      });
      const r = await result;
      expect(r.error).toBeNull();
      expect(r.models).toHaveLength(2);
      expect(r.models.map((m) => m.id)).toEqual(["chat-model", "chatx-model"]);
      expect(apiKeyArg).toBe("apipie-key");
    });
  });

  describe("openai provider with mocked OpenAI client", () => {
    it("filters fine-tuned models and OpenAI-owned models separately", async () => {
      let result;
      jest.isolateModules(() => {
        const openai = require("openai");
        jest.spyOn(openai, "OpenAI").mockImplementation(() => ({
          models: {
            list: jest.fn().mockResolvedValue({
              data: [
                { id: "gpt-4o", owned_by: "openai" },
                { id: "gpt-4o-mini", owned_by: "openai" },
                { id: "ft:gpt-3.5-turbo:custom", owned_by: "user-abc" },
                { id: "o1-mini", owned_by: "openai" },
                { id: "gpt-4-vision", owned_by: "openai" },
              ],
            }),
          },
        }));
        const { getCustomModels } = require("../../../utils/helpers/customModels");
        result = getCustomModels("openai", "sk-test");
      });
      const r = await result;
      expect(r.error).toBeNull();
      const ids = r.models.map((m) => m.id);
      expect(ids).toContain("gpt-4o");
      expect(ids).toContain("gpt-4o-mini");
      expect(ids).toContain("o1-mini");
      expect(ids).not.toContain("gpt-4-vision");
      // fine-tuned models are routed to "Your Fine-Tunes"
      const fineTunes = r.models.filter((m) => m.organization === "Your Fine-Tunes");
      expect(fineTunes.map((m) => m.id)).toContain("ft:gpt-3.5-turbo:custom");
    });

    it("falls back to default models when openai client throws", async () => {
      let result;
      jest.isolateModules(() => {
        const openai = require("openai");
        jest.spyOn(openai, "OpenAI").mockImplementation(() => ({
          models: {
            list: jest.fn().mockRejectedValue(new Error("network down")),
          },
        }));
        const { getCustomModels } = require("../../../utils/helpers/customModels");
        result = getCustomModels("openai", "sk-fail");
      });
      const r = await result;
      expect(r.error).toBeNull();
      const ids = r.models.map((m) => m.id);
      expect(ids).toContain("gpt-3.5-turbo");
      expect(ids).toContain("gpt-4o");
    });
  });

  describe("novita provider", () => {
    it("returns novita models from fetcher", async () => {
      let result;
      jest.isolateModules(() => {
        const novita = require("../../../utils/AiProviders/novita");
        jest.spyOn(novita, "fetchNovitaModels").mockResolvedValue({
          "novita/llama-3-70b": {
            id: "novita/llama-3-70b",
            name: "Llama 3 70B",
            organization: "Novita",
          },
        });
        const { getCustomModels } = require("../../../utils/helpers/customModels");
        result = getCustomModels("novita");
      });
      const r = await result;
      expect(r.error).toBeNull();
      expect(r.models).toHaveLength(1);
      expect(r.models[0].id).toBe("novita/llama-3-70b");
    });
  });

  describe("input validation edge cases", () => {
    it("rejects undefined provider", async () => {
      const { getCustomModels } = require("../../../utils/helpers/customModels");
      const r = await getCustomModels(undefined);
      expect(r.error).toBe("Invalid provider for custom models");
      expect(r.models).toEqual([]);
    });

    it("rejects numeric provider", async () => {
      const { getCustomModels } = require("../../../utils/helpers/customModels");
      const r = await getCustomModels(42);
      expect(r.error).toBe("Invalid provider for custom models");
    });

    it("rejects object provider", async () => {
      const { getCustomModels } = require("../../../utils/helpers/customModels");
      const r = await getCustomModels({ name: "openai" });
      expect(r.error).toBe("Invalid provider for custom models");
    });

    it("rejects case-different but unsupported provider", async () => {
      const { getCustomModels } = require("../../../utils/helpers/customModels");
      // "OpenAI" (capitalized) is not in SUPPORT_CUSTOM_MODELS (lowercase)
      const r = await getCustomModels("OpenAI");
      expect(r.error).toBe("Invalid provider for custom models");
    });
  });
});

describe("SUPPORT_CUSTOM_MODELS — additional coverage", () => {
  const { SUPPORT_CUSTOM_MODELS } = require("../../../utils/helpers/customModels");

  test("includes chat providers recently added", () => {
    expect(SUPPORT_CUSTOM_MODELS).toContain("minimax");
    expect(SUPPORT_CUSTOM_MODELS).toContain("cerebras");
    expect(SUPPORT_CUSTOM_MODELS).toContain("opencode-zen");
    expect(SUPPORT_CUSTOM_MODELS).toContain("generic-openai");
  });

  test("includes embedding engines and STT/TTS", () => {
    expect(SUPPORT_CUSTOM_MODELS).toContain("lemonade-embedder");
    expect(SUPPORT_CUSTOM_MODELS).toContain("lemonade-stt");
    expect(SUPPORT_CUSTOM_MODELS).toContain("openrouter-embedder");
    expect(SUPPORT_CUSTOM_MODELS).toContain("deepgram-stt");
  });

  test("contains only non-empty string entries", () => {
    for (const entry of SUPPORT_CUSTOM_MODELS) {
      expect(typeof entry).toBe("string");
      expect(entry.length).toBeGreaterThan(0);
    }
  });

  test("entries are unique case-insensitively (no near-duplicates)", () => {
    const lower = SUPPORT_CUSTOM_MODELS.map((s) => s.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });

  test("exports a non-empty list with more than 10 entries", () => {
    expect(SUPPORT_CUSTOM_MODELS.length).toBeGreaterThan(10);
  });
});
