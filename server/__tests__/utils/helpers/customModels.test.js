// SPDX-License-Identifier: MIT
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
