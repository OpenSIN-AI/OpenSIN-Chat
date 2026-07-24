// SPDX-License-Identifier: MIT
const {
  KEY_MAPPING,
  validLabelsForProvider,
} = require("../../../utils/helpers/keyModelMap");

describe("keyModelMap", () => {
  describe("KEY_MAPPING", () => {
    test("contains openai entry", () => {
      expect(KEY_MAPPING.openai).toBeDefined();
      expect(Array.isArray(KEY_MAPPING.openai)).toBe(true);
      expect(KEY_MAPPING.openai.length).toBeGreaterThan(0);
    });

    test("contains anthropic entry", () => {
      expect(KEY_MAPPING.anthropic).toBeDefined();
      expect(KEY_MAPPING.anthropic).toContain("anthropic_model_pref");
    });

    test("contains fireworksai entry", () => {
      expect(KEY_MAPPING.fireworksai).toBeDefined();
    });

    test("contains ollama entry", () => {
      expect(KEY_MAPPING.ollama).toBeDefined();
    });

    test("contains xai entry", () => {
      expect(KEY_MAPPING.xai).toBeDefined();
    });

    test("contains at least 15 providers", () => {
      expect(Object.keys(KEY_MAPPING).length).toBeGreaterThanOrEqual(15);
    });
  });

  describe("validLabelsForProvider", () => {
    test("returns labels for openai", () => {
      const labels = validLabelsForProvider("openai");
      expect(labels).toContain("OpenAiModelPref");
      expect(labels).toContain("open_ai_model_pref");
    });

    test("returns labels for anthropic", () => {
      const labels = validLabelsForProvider("anthropic");
      expect(labels).toContain("anthropic_model_pref");
    });

    test("returns labels for gemini", () => {
      const labels = validLabelsForProvider("gemini");
      expect(labels).toContain("gemini_llm_model_pref");
    });

    test("returns labels for nvidia-nim", () => {
      const labels = validLabelsForProvider("nvidia-nim");
      expect(labels).toContain("NvidiaNimLLMModelPref");
    });

    test("returns empty array for null provider", () => {
      expect(validLabelsForProvider(null)).toEqual([]);
    });

    test("returns empty array for undefined provider", () => {
      expect(validLabelsForProvider(undefined)).toEqual([]);
    });

    test("returns empty array for empty string", () => {
      expect(validLabelsForProvider("")).toEqual([]);
    });

    test("generates fallback label for unknown provider", () => {
      const labels = validLabelsForProvider("some-new-provider");
      expect(labels).toEqual(["some_new_provider_model_pref"]);
    });

    test("generates fallback label for unknown provider with hyphens", () => {
      const labels = validLabelsForProvider("my-custom-provider");
      expect(labels).toEqual(["my_custom_provider_model_pref"]);
    });

    test("returns both canonical and alias labels for known provider", () => {
      const labels = validLabelsForProvider("groq");
      expect(labels).toContain("groq_model_pref");
      expect(labels).toContain("GROQ_MODEL_PREF");
    });

    test("returns the canonical (first) label as first element", () => {
      const labels = validLabelsForProvider("mistral");
      expect(labels[0]).toBe("mistral_model_pref");
    });

    test("handles docker_model_runner with underscores", () => {
      const labels = validLabelsForProvider("docker_model_runner");
      expect(labels).toContain("docker_model_runner_llm_model_pref");
    });
  });
});
