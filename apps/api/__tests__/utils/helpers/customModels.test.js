// SPDX-License-Identifier: MIT
const mockList = jest.fn();

jest.mock("openai", () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    models: { list: mockList },
  })),
}));

const { getCustomModels, SUPPORT_CUSTOM_MODELS } = require("../../../utils/helpers/customModels");

describe("getCustomModels", () => {
  test("returns error for invalid provider", async () => {
    const result = await getCustomModels("invalid-provider");
    expect(result).toHaveProperty("models");
    expect(result).toHaveProperty("error");
    expect(result.models).toEqual([]);
    expect(result.error).toBe("Invalid provider for custom models");
  });

  test("returns error for empty provider", async () => {
    const result = await getCustomModels("");
    expect(result.error).toBe("Invalid provider for custom models");
  });

  test("returns error for null provider", async () => {
    const result = await getCustomModels(null);
    expect(result.error).toBe("Invalid provider for custom models");
  });
});

describe("SUPPORT_CUSTOM_MODELS", () => {
  test("is an array", () => {
    expect(Array.isArray(SUPPORT_CUSTOM_MODELS)).toBe(true);
  });

  test("includes common providers", () => {
    expect(SUPPORT_CUSTOM_MODELS).toContain("openai");
    expect(SUPPORT_CUSTOM_MODELS).toContain("anthropic");
    expect(SUPPORT_CUSTOM_MODELS).toContain("ollama");
  });

  test("includes embedding engines", () => {
    expect(SUPPORT_CUSTOM_MODELS).toContain("native-embedder");
  });

  test("includes STT engines", () => {
    expect(SUPPORT_CUSTOM_MODELS).toContain("openai-stt");
    expect(SUPPORT_CUSTOM_MODELS).toContain("deepgram-stt");
  });

  test("includes TTS engines", () => {
    expect(SUPPORT_CUSTOM_MODELS).toContain("kokoro-tts");
  });

  test("has no duplicate providers", () => {
    const unique = [...new Set(SUPPORT_CUSTOM_MODELS)];
    expect(SUPPORT_CUSTOM_MODELS.length).toBe(unique.length);
  });
});

describe("getCustomModels for generic-openai", () => {
  beforeEach(() => {
    mockList.mockReset();
  });

  test("returns static Fireworks fallback for SINator router without calling the API", async () => {
    const result = await getCustomModels(
      "generic-openai",
      "test-key",
      "https://sinatorpool-router.delqhi.com/inference/v1",
    );
    expect(mockList).not.toHaveBeenCalled();
    expect(result.error).toBeNull();
    expect(result.models.length).toBeGreaterThan(0);
    expect(result.models.map((m) => m.id)).toContain(
      "accounts/fireworks/models/deepseek-v4-pro",
    );
    expect(result.models.map((m) => m.id)).toContain(
      "accounts/fireworks/models/minimax-m3",
    );
    expect(result.models.map((m) => m.id)).toContain(
      "accounts/fireworks/models/kimi-k2p7-code",
    );
  });

  test("returns static Fireworks fallback when OpenAI /models fails", async () => {
    mockList.mockRejectedValue(new Error("403 Your request was blocked"));
    const result = await getCustomModels(
      "generic-openai",
      "test-key",
      "https://some-other-generic-openai.com/v1",
    );
    expect(result.error).toBeNull();
    expect(result.models.length).toBeGreaterThan(0);
    expect(result.models.map((m) => m.id)).toContain(
      "accounts/fireworks/models/deepseek-v4-pro",
    );
    expect(result.models.map((m) => m.id)).toContain(
      "accounts/fireworks/models/minimax-m3",
    );
    expect(result.models.map((m) => m.id)).toContain(
      "accounts/fireworks/models/kimi-k2p7-code",
    );
  });

  test("returns live models when OpenAI /models succeeds", async () => {
    mockList.mockResolvedValue({
      data: [
        { id: "custom-model-1", owned_by: "custom" },
        { id: "custom-model-2", owned_by: "custom" },
      ],
    });
    const result = await getCustomModels(
      "generic-openai",
      "test-key",
      "https://some-other-generic-openai.com/v1",
    );
    expect(result.error).toBeNull();
    expect(result.models).toHaveLength(2);
    expect(result.models[0]).toEqual({
      id: "custom-model-1",
      name: "custom-model-1",
      organization: "custom",
    });
  });
});
