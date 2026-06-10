// SPDX-License-Identifier: MIT
/* eslint-env jest */
/**
 * Regression tests for issues #112/#116:
 * OpenAI SDK v4+ throws "Missing credentials" when apiKey is null/empty,
 * which crashed @agent for every local/self-hosted provider. Each provider
 * must fall back to a non-empty placeholder when its API key env is unset,
 * and must respect the env var when it IS set.
 */
const PROVIDERS_ROOT = "../../../../../utils/agents/aibitat/providers";

jest.mock("../../../../../utils/AiProviders/foundry/index.js", () => ({
  parseFoundryBasePath: (p) => p || "http://127.0.0.1:5273/v1",
  FoundryLLM: {
    cacheContextWindows: jest.fn().mockResolvedValue(undefined),
    promptWindowLimit: jest.fn().mockReturnValue(4096),
  },
}));
jest.mock("../../../../../utils/AiProviders/dellProAiStudio/index.js", () => ({
  DellProAiStudioLLM: {
    parseBasePath: jest.fn().mockReturnValue("http://127.0.0.1:8553/v1/openai"),
  },
}));
jest.mock("../../../../../utils/AiProviders/privatemode/index.js", () => ({
  PrivatemodeLLM: {
    parseBasePath: jest.fn().mockReturnValue("http://127.0.0.1:8080/v1"),
  },
}));

describe("agent provider apiKey fallbacks (#112/#116)", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    // Baseline: local provider base paths set, all API keys UNSET.
    process.env.KOBOLD_CPP_BASE_PATH = "http://127.0.0.1:5000/v1";
    process.env.KOBOLD_CPP_MODEL_PREF = "test-model";
    process.env.FOUNDRY_MODEL_PREF = "test-model";
    process.env.PRIVATEMODE_LLM_MODEL_PREF = "test-model";
    process.env.DPAIS_LLM_MODEL_PREF = "test-model";
    delete process.env.KOBOLD_CPP_API_KEY;
    delete process.env.FOUNDRY_API_KEY;
    delete process.env.PRIVATEMODE_LLM_API_KEY;
    delete process.env.DPAIS_LLM_API_KEY;
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  const cases = [
    {
      name: "KoboldCPP",
      file: `${PROVIDERS_ROOT}/koboldcpp.js`,
      envKey: "KOBOLD_CPP_API_KEY",
      placeholder: "kobold-cpp",
    },
    {
      name: "Foundry",
      file: `${PROVIDERS_ROOT}/foundry.js`,
      envKey: "FOUNDRY_API_KEY",
      placeholder: "foundry",
    },
    {
      name: "Privatemode",
      file: `${PROVIDERS_ROOT}/privatemode.js`,
      envKey: "PRIVATEMODE_LLM_API_KEY",
      placeholder: "privatemode",
    },
    {
      name: "DellProAiStudio",
      file: `${PROVIDERS_ROOT}/dellProAiStudio.js`,
      envKey: "DPAIS_LLM_API_KEY",
      placeholder: "dell-pro-ai-studio",
    },
  ];

  describe.each(cases)("$name provider", ({ file, envKey, placeholder }) => {
    test("constructs WITHOUT an API key (no 'Missing credentials' crash)", () => {
      const ProviderClass = require(file);
      expect(() => new ProviderClass({})).not.toThrow();
    });

    test(`falls back to "${placeholder}" placeholder when ${envKey} is unset`, () => {
      const ProviderClass = require(file);
      const provider = new ProviderClass({});
      expect(provider.client.apiKey).toBe(placeholder);
    });

    test(`uses ${envKey} from the environment when set`, () => {
      process.env[envKey] = "sk-real-key-123";
      jest.resetModules();
      const ProviderClass = require(file);
      const provider = new ProviderClass({});
      expect(provider.client.apiKey).toBe("sk-real-key-123");
    });

    test("never passes null/empty apiKey to the OpenAI client", () => {
      const ProviderClass = require(file);
      const provider = new ProviderClass({});
      expect(provider.client.apiKey).toBeTruthy();
      expect(typeof provider.client.apiKey).toBe("string");
      expect(provider.client.apiKey.length).toBeGreaterThan(0);
    });
  });
});
