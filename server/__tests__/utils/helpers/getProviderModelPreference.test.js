// SPDX-License-Identifier: MIT
/* eslint-env jest */

/**
 * Tests for getProviderModelPreference (issue #100).
 *
 * Order of precedence:
 *   1. system_settings value (DB wins) — must beat ENV
 *   2. process.env value (deploy-time default)
 *   3. null
 */

const path = require("path");

const SYSTEM_SETTINGS_PATH = path.resolve(
  __dirname,
  "../../../models/systemSettings"
);

function loadFresh(mocks = {}) {
  jest.resetModules();
  jest.doMock(SYSTEM_SETTINGS_PATH, () => ({
    SystemSettings: {
      get: jest.fn(async ({ label }) => {
        if (Object.prototype.hasOwnProperty.call(mocks, label))
          return { value: mocks[label] };
        return null;
      }),
    },
  }));
  return require("../../../utils/helpers");
}

describe("getProviderModelPreference", () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  test("returns null when provider is null/unknown", async () => {
    const { getProviderModelPreference } = loadFresh();
    expect(await getProviderModelPreference(null)).toBeNull();
    expect(await getProviderModelPreference("not-a-real-provider")).toBeNull();
  });

  test("DB value beats ENV (the #100 fix)", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NVIDIA_NIM_LLM_MODEL_PREF: "nvidia/nemotron-3-ultra-550b-a55b",
    };
    const { getProviderModelPreference } = loadFresh({
      NvidiaNimLLMModelPref: "nvidia/nemotron-nano-12b-v2-vl",
    });
    expect(await getProviderModelPreference("nvidia-nim")).toBe(
      "nvidia/nemotron-nano-12b-v2-vl"
    );
  });

  test("falls back to ENV when DB is empty", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NVIDIA_NIM_LLM_MODEL_PREF: "nvidia/nemotron-3-ultra-550b-a55b",
    };
    const { getProviderModelPreference } = loadFresh({});
    expect(await getProviderModelPreference("nvidia-nim")).toBe(
      "nvidia/nemotron-3-ultra-550b-a55b"
    );
  });

  test("falls back to ENV when DB value is whitespace", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NVIDIA_NIM_LLM_MODEL_PREF: "nvidia/nemotron-3-ultra-550b-a55b",
    };
    const { getProviderModelPreference } = loadFresh({
      NvidiaNimLLMModelPref: "   ",
    });
    expect(await getProviderModelPreference("nvidia-nim")).toBe(
      "nvidia/nemotron-3-ultra-550b-a55b"
    );
  });

  test("returns null when neither DB nor ENV is set", async () => {
    delete process.env.NVIDIA_NIM_LLM_MODEL_PREF;
    const { getProviderModelPreference } = loadFresh({});
    expect(await getProviderModelPreference("nvidia-nim")).toBeNull();
  });

  test("DB wins for openai as well", async () => {
    process.env = { ...ORIGINAL_ENV, OPEN_MODEL_PREF: "gpt-4o" };
    const { getProviderModelPreference } = loadFresh({
      OpenAiModelPref: "gpt-4o-mini",
    });
    expect(await getProviderModelPreference("openai")).toBe("gpt-4o-mini");
  });

  test("works when SystemSettings is unreachable (boot fallback)", async () => {
    process.env = { ...ORIGINAL_ENV, OPEN_MODEL_PREF: "gpt-4o" };
    jest.resetModules();
    jest.doMock(SYSTEM_SETTINGS_PATH, () => {
      throw new Error("prisma not ready");
    });
    const { getProviderModelPreference } = require("../../../utils/helpers");
    expect(await getProviderModelPreference("openai")).toBe("gpt-4o");
  });

  test("DB snake_case alias (legacy/issue #100) beats ENV", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NVIDIA_NIM_LLM_MODEL_PREF: "nvidia/nemotron-3-ultra-550b-a55b",
    };
    const { getProviderModelPreference } = loadFresh({
      nvidia_nim_model_pref: "nvidia/nemotron-nano-12b-v2-vl",
    });
    expect(await getProviderModelPreference("nvidia-nim")).toBe(
      "nvidia/nemotron-nano-12b-v2-vl"
    );
  });

  test("canonical label wins over snake_case alias when both set", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NVIDIA_NIM_LLM_MODEL_PREF: "nvidia/nemotron-3-ultra-550b-a55b",
    };
    const { getProviderModelPreference } = loadFresh({
      NvidiaNimLLMModelPref: "nvidia/canonical-wins",
      nvidia_nim_model_pref: "nvidia/snake-loses",
    });
    expect(await getProviderModelPreference("nvidia-nim")).toBe("nvidia/canonical-wins");
  });
});
