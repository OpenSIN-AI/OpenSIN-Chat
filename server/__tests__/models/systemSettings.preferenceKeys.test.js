// SPDX-License-Identifier: MIT
// Issue #3 — Tests for the SettingsManager migration of llmPreferenceKeys,
// vectorDBPreferenceKeys, and agent search keys in systemSettings.js.
//
// These functions were previously synchronous and read directly from
// process.env. After Issue #3 they are async and read via
// SettingsManager.get(), which falls back to process.env gracefully.

jest.mock("../../utils/prisma", () => ({
  managed_env_settings: {
    findUnique: jest.fn(), // SettingsManager.get will fall back to process.env
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  settings_audit_log: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
}));

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  log: jest.fn(),
}));



jest.mock("../../utils/files", () => ({
  purgeEntireVectorCache: jest.fn().mockResolvedValue(undefined),
  hasVectorCachedFiles: jest.fn().mockResolvedValue(false),
}));

jest.mock("../../utils/BackgroundWorkers/index.js", () => ({
  BackgroundWorkers: { setupBackgroundJobs: jest.fn() },
}));

// utils/agents/aibitat pulls in a large set of LLM provider packages
// (@langchain/openai, @anthropic-ai/sdk, etc.) that are not installed
// in the unit-test environment. Mock the entire subtree here so that
// any inline require() inside systemSettings.js that touches aibitat
// does not cause "Cannot find module" errors.
jest.mock("../../utils/agents/aibitat/utils/toolReranker.js", () => ({
  reRankTools: jest.fn().mockResolvedValue([]),
  ToolReranker: {
    isEnabled: jest.fn().mockReturnValue(false),
    getTopN: jest.fn().mockReturnValue(3),
  },
}));
jest.mock(
  "../../utils/agents/aibitat/plugins/sql-agent/SQLConnectors/utils",
  () => ({ SQLConnectorPool: {} })
);
jest.mock("../../utils/agents/aibitat/plugins/gmail/lib", () => ({}));
jest.mock("../../utils/agents/aibitat/plugins/google-calendar/lib", () => ({}));
jest.mock("../../utils/agents/aibitat/plugins/outlook/lib", () => ({}));
jest.mock("../../utils/agents/aibitat", () => ({
  defaultMaxToolCalls: jest.fn().mockReturnValue(3),
}));

jest.mock("../../utils/EncryptionManager", () => ({
  EncryptionManager: class {
    encrypt(v) {
      return `enc:${v}`;
    }
    decrypt(v) {
      return v?.replace?.("enc:", "") ?? null;
    }
  },
}));

const { SettingsManager } = require("../../utils/SettingsManager");
const { SystemSettings } = require("../../models/systemSettings");

// Keys we toggle in tests — saved/restored in beforeEach/afterEach
const TEST_KEYS = [
  "OPEN_AI_KEY",
  "OPEN_MODEL_PREF",
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_KEY",
  "AZURE_OPENAI_MODEL_PREF",
  "AZURE_OPENAI_TOKEN_LIMIT",
  "AZURE_OPENAI_MODEL_TYPE",
  "EMBEDDING_MODEL_PREF",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL_PREF",
  "ANTHROPIC_CACHE_CONTROL",
  "GEMINI_API_KEY",
  "GEMINI_LLM_MODEL_PREF",
  "GEMINI_SAFETY_SETTING",
  "LMSTUDIO_BASE_PATH",
  "LMSTUDIO_MODEL_TOKEN_LIMIT",
  "LMSTUDIO_MODEL_PREF",
  "LMSTUDIO_AUTH_TOKEN",
  "LOCAL_AI_API_KEY",
  "LOCAL_AI_BASE_PATH",
  "LOCAL_AI_MODEL_PREF",
  "LOCAL_AI_MODEL_TOKEN_LIMIT",
  "OLLAMA_AUTH_TOKEN",
  "OLLAMA_BASE_PATH",
  "OLLAMA_MODEL_PREF",
  "OLLAMA_MODEL_TOKEN_LIMIT",
  "OLLAMA_KEEP_ALIVE_TIMEOUT",
  "FIREWORKS_AI_LLM_API_KEY",
  "FIREWORKS_AI_LLM_MODEL_PREF",
  "MISTRAL_API_KEY",
  "MISTRAL_MODEL_PREF",
  "GROQ_API_KEY",
  "GROQ_MODEL_PREF",
  "HUGGING_FACE_LLM_ENDPOINT",
  "HUGGING_FACE_LLM_API_KEY",
  "HUGGING_FACE_LLM_TOKEN_LIMIT",
  "LITE_LLM_MODEL_PREF",
  "LITE_LLM_MODEL_TOKEN_LIMIT",
  "LITE_LLM_BASE_PATH",
  "LITE_LLM_API_KEY",
  "GENERIC_OPEN_AI_BASE_PATH",
  "GENERIC_OPEN_AI_MODEL_PREF",
  "GENERIC_OPEN_AI_MODEL_TOKEN_LIMIT",
  "GENERIC_OPEN_AI_API_KEY",
  "GENERIC_OPEN_AI_MAX_TOKENS",
  "XAI_LLM_API_KEY",
  "XAI_LLM_MODEL_PREF",
  "NVIDIA_NIM_LLM_BASE_PATH",
  "NVIDIA_NIM_LLM_MODEL_PREF",
  "NVIDIA_NIM_LLM_MODEL_TOKEN_LIMIT",
  "OPENCODE_ZEN_BASE_PATH",
  "OPENCODE_ZEN_MODEL_PREF",
  "OPENCODE_ZEN_MODEL_TOKEN_LIMIT",
  "OPENCODE_ZEN_API_KEY",
  "DOCKER_MODEL_RUNNER_BASE_PATH",
  "DOCKER_MODEL_RUNNER_LLM_MODEL_PREF",
  "DOCKER_MODEL_RUNNER_LLM_MODEL_TOKEN_LIMIT",
  "PINECONE_API_KEY",
  "PINECONE_INDEX",
  "CHROMA_ENDPOINT",
  "CHROMA_API_HEADER",
  "CHROMA_API_KEY",
  "CHROMACLOUD_API_KEY",
  "CHROMACLOUD_TENANT",
  "CHROMACLOUD_DATABASE",
  "WEAVIATE_ENDPOINT",
  "WEAVIATE_API_KEY",
  "QDRANT_ENDPOINT",
  "QDRANT_API_KEY",
  "MILVUS_ADDRESS",
  "MILVUS_USERNAME",
  "MILVUS_PASSWORD",
  "ZILLIZ_ENDPOINT",
  "ZILLIZ_API_TOKEN",
  "ASTRA_DB_APPLICATION_TOKEN",
  "ASTRA_DB_ENDPOINT",
  "AGENT_SERPAPI_API_KEY",
  "AGENT_SERPAPI_ENGINE",
  "AGENT_SEARCHAPI_API_KEY",
  "AGENT_SEARCHAPI_ENGINE",
  "AGENT_SERPER_DEV_KEY",
  "AGENT_BING_SEARCH_API_KEY",
  "AGENT_BAIDU_SEARCH_API_KEY",
  "AGENT_SERPLY_API_KEY",
  "AGENT_SEARXNG_API_URL",
  "AGENT_TAVILY_API_KEY",
  "AGENT_EXA_API_KEY",
  "AGENT_PERPLEXITY_API_KEY",
];

describe("Issue #3 — systemSettings SettingsManager migration", () => {
  let savedEnv = {};

  beforeEach(() => {
    savedEnv = {};
    for (const key of TEST_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    SettingsManager.clearCache();
  });

  afterEach(() => {
    for (const key of TEST_KEYS) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key];
      } else {
        delete process.env[key];
      }
    }
    SettingsManager.clearCache();
  });

  // ───────────────────────────────────────────────────────────────────
  // llmPreferenceKeys
  // ───────────────────────────────────────────────────────────────────
  describe("llmPreferenceKeys (async, SettingsManager-backed)", () => {
    it("returns an object (is async, returns a Promise)", async () => {
      const result = SystemSettings.llmPreferenceKeys();
      expect(result).toBeInstanceOf(Promise);
      const keys = await result;
      expect(typeof keys).toBe("object");
      expect(keys).not.toBeNull();
    });

    it("reads OpenAI key and model pref from SettingsManager", async () => {
      process.env.OPEN_AI_KEY = "sk-test-123";
      process.env.OPEN_MODEL_PREF = "gpt-4o-mini";
      const keys = await SystemSettings.llmPreferenceKeys();
      expect(keys.OpenAiKey).toBe(true);
      expect(keys.OpenAiModelPref).toBe("gpt-4o-mini");
    });

    it("falls back to default model pref when OPEN_MODEL_PREF is unset", async () => {
      const keys = await SystemSettings.llmPreferenceKeys();
      expect(keys.OpenAiModelPref).toBe("gpt-4o");
    });

    it("reads Anthropic keys with defaults", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-123";
      const keys = await SystemSettings.llmPreferenceKeys();
      expect(keys.AnthropicApiKey).toBe(true);
      expect(keys.AnthropicModelPref).toBe("claude-sonnet-4-6");
      expect(keys.AnthropicCacheControl).toBe("none");
    });

    it("reads Gemini keys with defaults", async () => {
      process.env.GEMINI_API_KEY = "gemini-key";
      process.env.GEMINI_LLM_MODEL_PREF = "gemini-1.5-pro";
      process.env.GEMINI_SAFETY_SETTING = "BLOCK_ONLY_HIGH";
      const keys = await SystemSettings.llmPreferenceKeys();
      expect(keys.GeminiLLMApiKey).toBe(true);
      expect(keys.GeminiLLMModelPref).toBe("gemini-1.5-pro");
      expect(keys.GeminiSafetySetting).toBe("BLOCK_ONLY_HIGH");
    });

    it("reads Ollama keys with keep-alive default", async () => {
      process.env.OLLAMA_BASE_PATH = "http://localhost:11434";
      process.env.OLLAMA_MODEL_PREF = "llama3";
      const keys = await SystemSettings.llmPreferenceKeys();
      expect(keys.OllamaLLMBasePath).toBe("http://localhost:11434");
      expect(keys.OllamaLLMModelPref).toBe("llama3");
      expect(keys.OllamaLLMKeepAliveSeconds).toBe(300);
    });

    it("reads Azure OpenAI with fallback to OPEN_MODEL_PREF", async () => {
      process.env.OPEN_MODEL_PREF = "gpt-4o";
      process.env.AZURE_OPENAI_ENDPOINT = "https://my.azure.com";
      process.env.AZURE_OPENAI_KEY = "azure-key";
      const keys = await SystemSettings.llmPreferenceKeys();
      expect(keys.AzureOpenAiEndpoint).toBe("https://my.azure.com");
      expect(keys.AzureOpenAiKey).toBe(true);
      expect(keys.AzureOpenAiModelPref).toBe("gpt-4o"); // falls back to OPEN_MODEL_PREF
      expect(keys.AzureOpenAiTokenLimit).toBe(4096); // default
      expect(keys.AzureOpenAiModelType).toBe("default"); // default
    });

    it("reads Docker Model Runner with token limit default", async () => {
      process.env.DOCKER_MODEL_RUNNER_BASE_PATH = "http://localhost:12434";
      process.env.DOCKER_MODEL_RUNNER_LLM_MODEL_PREF = "ai/qwen2.5";
      const keys = await SystemSettings.llmPreferenceKeys();
      expect(keys.DockerModelRunnerBasePath).toBe("http://localhost:12434");
      expect(keys.DockerModelRunnerModelPref).toBe("ai/qwen2.5");
      expect(keys.DockerModelRunnerModelTokenLimit).toBe(8192); // default
    });

    it("returns false for unset API key flags", async () => {
      const keys = await SystemSettings.llmPreferenceKeys();
      expect(keys.OpenAiKey).toBe(false);
      expect(keys.AnthropicApiKey).toBe(false);
      expect(keys.GeminiLLMApiKey).toBe(false);
      expect(keys.LMStudioAuthToken).toBe(false);
      expect(keys.OllamaLLMAuthToken).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // vectorDBPreferenceKeys
  // ───────────────────────────────────────────────────────────────────
  describe("vectorDBPreferenceKeys (async, SettingsManager-backed)", () => {
    it("returns an object (is async, returns a Promise)", async () => {
      const result = SystemSettings.vectorDBPreferenceKeys();
      expect(result).toBeInstanceOf(Promise);
      const keys = await result;
      expect(typeof keys).toBe("object");
      expect(keys).not.toBeNull();
    });

    it("reads Pinecone keys from SettingsManager", async () => {
      process.env.PINECONE_API_KEY = "pinecone-key";
      process.env.PINECONE_INDEX = "my-index";
      const keys = await SystemSettings.vectorDBPreferenceKeys();
      expect(keys.PineConeKey).toBe(true);
      expect(keys.PineConeIndex).toBe("my-index");
    });

    it("reads Chroma keys from SettingsManager", async () => {
      process.env.CHROMA_ENDPOINT = "http://localhost:8000";
      process.env.CHROMA_API_KEY = "chroma-key";
      const keys = await SystemSettings.vectorDBPreferenceKeys();
      expect(keys.ChromaEndpoint).toBe("http://localhost:8000");
      expect(keys.ChromaApiKey).toBe(true);
    });

    it("reads Weaviate keys from SettingsManager", async () => {
      process.env.WEAVIATE_ENDPOINT = "http://localhost:8080";
      process.env.WEAVIATE_API_KEY = "weaviate-key";
      const keys = await SystemSettings.vectorDBPreferenceKeys();
      expect(keys.WeaviateEndpoint).toBe("http://localhost:8080");
      expect(keys.WeaviateApiKey).toBe(true);
    });

    it("reads Qdrant keys from SettingsManager", async () => {
      process.env.QDRANT_ENDPOINT = "http://localhost:6333";
      process.env.QDRANT_API_KEY = "qdrant-key";
      const keys = await SystemSettings.vectorDBPreferenceKeys();
      expect(keys.QdrantEndpoint).toBe("http://localhost:6333");
      expect(keys.QdrantApiKey).toBe(true);
    });

    it("returns false for unset vector DB key flags", async () => {
      const keys = await SystemSettings.vectorDBPreferenceKeys();
      expect(keys.PineConeKey).toBe(false);
      expect(keys.ChromaApiKey).toBe(false);
      expect(keys.WeaviateApiKey).toBe(false);
      expect(keys.QdrantApiKey).toBe(false);
      expect(keys.MilvusPassword).toBe(false);
      expect(keys.ZillizApiToken).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // currentSettings — agent search keys
  // ───────────────────────────────────────────────────────────────────
  describe("currentSettings — agent search keys (SettingsManager-backed)", () => {
    it("reads agent search API keys from SettingsManager", async () => {
      process.env.AGENT_SERPAPI_API_KEY = "serp-key";
      process.env.AGENT_SERPAPI_ENGINE = "bing";
      process.env.AGENT_TAVILY_API_KEY = "tavily-key";
      const settings = await SystemSettings.currentSettings();
      expect(settings.AgentSerpApiKey).toBe(true);
      expect(settings.AgentSerpApiEngine).toBe("bing");
      expect(settings.AgentTavilyApiKey).toBe(true);
    });

    it("defaults agent search engine to 'google'", async () => {
      const settings = await SystemSettings.currentSettings();
      expect(settings.AgentSerpApiEngine).toBe("google");
      expect(settings.AgentSearchApiEngine).toBe("google");
    });

    it("returns null for unset agent search API keys", async () => {
      const settings = await SystemSettings.currentSettings();
      expect(settings.AgentSerpApiKey).toBe(null);
      expect(settings.AgentSerperApiKey).toBe(null);
      expect(settings.AgentTavilyApiKey).toBe(null);
      expect(settings.AgentExaApiKey).toBe(null);
      expect(settings.AgentPerplexityApiKey).toBe(null);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // Bootstrap keys stay in process.env
  // ───────────────────────────────────────────────────────────────────
  describe("bootstrap keys remain in process.env", () => {
    it("AUTH_TOKEN and JWT_SECRET are read from process.env, not SettingsManager", async () => {
      process.env.AUTH_TOKEN = "auth-token-value";
      process.env.JWT_SECRET = "jwt-secret-value";
      const settings = await SystemSettings.currentSettings();
      expect(settings.RequiresAuth).toBe(true);
      expect(settings.AuthToken).toBe(true);
      expect(settings.JWTSecret).toBe(true);
    });

    it("Returns false for auth when AUTH_TOKEN is unset", async () => {
      delete process.env.AUTH_TOKEN;
      const settings = await SystemSettings.currentSettings();
      expect(settings.RequiresAuth).toBe(false);
      expect(settings.AuthToken).toBe(false);
    });
  });
});
