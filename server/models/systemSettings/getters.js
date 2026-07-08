// SPDX-License-Identifier: MIT
// Purpose: Read operations and feature-check methods for SystemSettings.
// Extracted from systemSettings.js as part of issue #510 God-File split.

const consoleLogger = require("../../utils/logger/console.js");
const { getStoragePath } = require("../../utils/paths");
const { SettingsManager } = require("../../utils/SettingsManager");
const { PGVector } = require("../../utils/vectorDbProviders/pgvector");
const { NativeEmbedder } = require("../../utils/EmbeddingEngines/native");
const { getBaseLLMProviderModel } = require("../../utils/helpers");
const { safeJsonParse } = require("../../utils/http");
const {
  ConnectionStringParser,
} = require("../../utils/agents/aibitat/plugins/sql-agent/SQLConnectors/utils");
const prisma = require("../../utils/prisma");

/**
 * Creates getter methods bound to a SystemSettings instance.
 * @param {Object} ss - The SystemSettings object (for self-referencing calls)
 * @returns {Object} Getter methods
 */
function createGetters(ss) {
  return {
    currentSettings: async function () {
      const { hasVectorCachedFiles } = require("../../utils/files");
      const {
        ToolReranker,
      } = require("../../utils/agents/aibitat/utils/toolReranker");
      const AIbitat = require("../../utils/agents/aibitat");

      // Issue #3: Read provider selection settings from the DB-backed
      // SettingsManager (source of truth after Phase 4). Falls back to
      // process.env gracefully during migration / first boot.
      const llmProvider = await SettingsManager.get("LLM_PROVIDER");
      const vectorDB = await SettingsManager.get("VECTOR_DB");
      const embeddingEngine =
        (await SettingsManager.get("EMBEDDING_ENGINE")) ?? "native";
      return {
        // --------------------------------------------------------
        // General Settings
        // Bootstrap secrets (AUTH_TOKEN, JWT_SECRET) stay in process.env —
        // they are loaded before the DB/encryption layer is available.
        // --------------------------------------------------------
        RequiresAuth: !!process.env.AUTH_TOKEN,
        AuthToken: !!process.env.AUTH_TOKEN,
        JWTSecret: !!process.env.JWT_SECRET,
        StorageDir: getStoragePath(),
        MultiUserMode: await ss.isMultiUserMode(),
        MemoryEnabled: await ss.memoriesEnabled(),
        MemoryAutoExtraction: await ss.memoryAutoExtractionSetting(),
        DisableTelemetry:
          (await SettingsManager.get("DISABLE_TELEMETRY")) || "false",

        // --------------------------------------------------------
        // Embedder Provider Selection Settings & Configs
        // --------------------------------------------------------
        EmbeddingEngine: embeddingEngine,
        HasExistingEmbeddings: await ss.hasEmbeddings(),
        HasCachedEmbeddings: await hasVectorCachedFiles(),
        EmbeddingBasePath: await SettingsManager.get("EMBEDDING_BASE_PATH"),
        EmbeddingModelPref:
          embeddingEngine === "native"
            ? NativeEmbedder._getEmbeddingModel()
            : await SettingsManager.get("EMBEDDING_MODEL_PREF"),
        EmbeddingOutputDimensions:
          (await SettingsManager.get("EMBEDDING_OUTPUT_DIMENSIONS")) || null,
        EmbeddingModelMaxChunkLength: await SettingsManager.get(
          "EMBEDDING_MODEL_MAX_CHUNK_LENGTH",
        ),
        OllamaEmbeddingBatchSize:
          (await SettingsManager.get("OLLAMA_EMBEDDING_BATCH_SIZE")) || 1,
        VoyageAiApiKey: !!(await SettingsManager.get("VOYAGEAI_API_KEY")),
        GenericOpenAiEmbeddingApiKey:
          !!(await SettingsManager.get("GENERIC_OPEN_AI_EMBEDDING_API_KEY")),
        GenericOpenAiEmbeddingMaxConcurrentChunks:
          (await SettingsManager.get(
            "GENERIC_OPEN_AI_EMBEDDING_MAX_CONCURRENT_CHUNKS",
          )) || 500,
        GeminiEmbeddingApiKey: !!(await SettingsManager.get(
          "GEMINI_EMBEDDING_API_KEY",
        )),

        // --------------------------------------------------------
        // VectorDB Provider Selection Settings & Configs
        // --------------------------------------------------------
        VectorDB: vectorDB,
        ...ss.vectorDBPreferenceKeys(),

        // --------------------------------------------------------
        // LLM Provider Selection Settings & Configs
        // --------------------------------------------------------
        LLMProvider: llmProvider,
        LLMModel: getBaseLLMProviderModel({ provider: llmProvider }) || null,
        ModelRouterId:
          (await SettingsManager.get("MODEL_ROUTER_ID")) || null,
        ...ss.llmPreferenceKeys(),

        // --------------------------------------------------------
        // Whisper (Audio transcription) Selection Settings & Configs
        // --------------------------------------------------------
        WhisperProvider:
          (await SettingsManager.get("WHISPER_PROVIDER")) || "local",
        WhisperModelPref:
          (await SettingsManager.get("WHISPER_MODEL_PREF")) ||
          "Xenova/whisper-small",

        // --------------------------------------------------------
        // TTS/STT Selection Settings & Configs
        // --------------------------------------------------------
        TextToSpeechProvider:
          (await SettingsManager.get("TTS_PROVIDER")) || "native",
        TTSOpenAIKey: !!(await SettingsManager.get("TTS_OPEN_AI_KEY")),
        TTSOpenAIVoiceModel: await SettingsManager.get("TTS_OPEN_AI_VOICE_MODEL"),

        // Eleven Labs TTS
        TTSElevenLabsKey: !!(await SettingsManager.get("TTS_ELEVEN_LABS_KEY")),
        TTSElevenLabsVoiceModel: await SettingsManager.get(
          "TTS_ELEVEN_LABS_VOICE_MODEL",
        ),
        // Piper TTS
        TTSPiperTTSVoiceModel:
          (await SettingsManager.get("TTS_PIPER_VOICE_MODEL")) ??
          "en_US-hfc_female-medium",
        // OpenAI Generic TTS
        TTSOpenAICompatibleKey: !!(await SettingsManager.get(
          "TTS_OPEN_AI_COMPATIBLE_KEY",
        )),
        TTSOpenAICompatibleModel: await SettingsManager.get(
          "TTS_OPEN_AI_COMPATIBLE_MODEL",
        ),
        TTSOpenAICompatibleVoiceModel: await SettingsManager.get(
          "TTS_OPEN_AI_COMPATIBLE_VOICE_MODEL",
        ),
        TTSOpenAICompatibleEndpoint: await SettingsManager.get(
          "TTS_OPEN_AI_COMPATIBLE_ENDPOINT",
        ),
        // Kokoro TTS
        TTSKokoroEndpoint: await SettingsManager.get("TTS_KOKORO_ENDPOINT"),
        TTSKokoroKey: !!(await SettingsManager.get("TTS_KOKORO_KEY")),
        TTSKokoroVoiceModel: await SettingsManager.get("TTS_KOKORO_VOICE_MODEL"),

        // cvoice.ai TTS
        TTSCvoiceApiKey: !!(await SettingsManager.get("TTS_CVOICE_API_KEY")),
        TTSCvoiceEndpoint: await SettingsManager.get("TTS_CVOICE_ENDPOINT"),
        TTSCvoiceVoiceModel: await SettingsManager.get("TTS_CVOICE_VOICE_MODEL"),
        TTSCvoiceCustomVoiceModel: await SettingsManager.get(
          "TTS_CVOICE_CUSTOM_VOICE_MODEL",
        ),
        TTSCvoicePersonName: await SettingsManager.get(
          "TTS_CVOICE_PERSON_NAME",
        ),
        TTSCvoicePersonSlug: await SettingsManager.get(
          "TTS_CVOICE_PERSON_SLUG",
        ),

        // STT Selection
        SpeechToTextProvider:
          (await SettingsManager.get("STT_PROVIDER")) || "native",
        // STT OpenAI
        STTOpenAIModel: await SettingsManager.get("STT_OPEN_AI_MODEL"),

        // STT Deepgram
        STTDeepgramApiKey: !!(await SettingsManager.get("STT_DEEPGRAM_API_KEY")),
        STTDeepgramModel: await SettingsManager.get("STT_DEEPGRAM_MODEL"),

        // STT Generic OpenAI
        STTOpenAICompatibleKey: !!(await SettingsManager.get(
          "STT_OPEN_AI_COMPATIBLE_KEY",
        )),
        STTOpenAICompatibleModel: await SettingsManager.get(
          "STT_OPEN_AI_COMPATIBLE_MODEL",
        ),
        STTOpenAICompatibleEndpoint: await SettingsManager.get(
          "STT_OPEN_AI_COMPATIBLE_ENDPOINT",
        ),

        // --------------------------------------------------------
        // Agent Settings & Configs
        // --------------------------------------------------------
        AgentSerpApiKey: !!process.env.AGENT_SERPAPI_API_KEY || null,
        AgentSerpApiEngine: process.env.AGENT_SERPAPI_ENGINE || "google",
        AgentSearchApiKey: !!process.env.AGENT_SEARCHAPI_API_KEY || null,
        AgentSearchApiEngine: process.env.AGENT_SEARCHAPI_ENGINE || "google",
        AgentSerperApiKey: !!process.env.AGENT_SERPER_DEV_KEY || null,
        AgentBingSearchApiKey: !!process.env.AGENT_BING_SEARCH_API_KEY || null,
        AgentBaiduSearchApiKey: !!process.env.AGENT_BAIDU_SEARCH_API_KEY || null,
        AgentSerplyApiKey: !!process.env.AGENT_SERPLY_API_KEY || null,
        AgentSearXNGApiUrl: process.env.AGENT_SEARXNG_API_URL || null,
        AgentTavilyApiKey: !!process.env.AGENT_TAVILY_API_KEY || null,
        AgentExaApiKey: !!process.env.AGENT_EXA_API_KEY || null,
        AgentPerplexityApiKey: !!process.env.AGENT_PERPLEXITY_API_KEY || null,

        // --------------------------------------------------------
        // Compliance Settings
        // --------------------------------------------------------
        // Disable View Chat History for the whole instance.
        DisableViewChatHistory:
          "DISABLE_VIEW_CHAT_HISTORY" in process.env || false,
        WorkspaceDeletionProtection:
          "WORKSPACE_DELETION_PROTECTION" in process.env || false,

        // --------------------------------------------------------
        // Simple SSO Settings
        // --------------------------------------------------------
        SimpleSSOEnabled: "SIMPLE_SSO_ENABLED" in process.env || false,
        SimpleSSONoLogin: "SIMPLE_SSO_NO_LOGIN" in process.env || false,
        SimpleSSONoLoginRedirect: ss.simpleSSO.noLoginRedirect(),

        // --------------------------------------------------------
        // Agent Skill Settings
        // --------------------------------------------------------
        AgentSkillMaxToolCalls: AIbitat.defaultMaxToolCalls(),
        AgentSkillRerankerEnabled: ToolReranker.isEnabled(),
        AgentSkillRerankerTopN: ToolReranker.getTopN(),
        AgentClarifyingQuestionsEnabled:
          (await ss.getValueOrFallback(
            { label: "agent_clarifying_questions_enabled" },
            "false",
          )) === "true",
        AgentClarifyingQuestionsMaxPerTurn: Number(
          (await ss.getValueOrFallback(
            { label: "agent_clarifying_questions_max_per_turn" },
            "3",
          )) || 3,
        ),
      };
    },

    get: async function (clause = {}) {
      try {
        const setting = await prisma.system_settings.findFirst({ where: clause });
        return setting || null;
      } catch (error) {
        consoleLogger.error(error.message);
        return null;
      }
    },

    getValueOrFallback: async function (clause = {}, fallback = null) {
      try {
        return (await ss.get(clause))?.value ?? fallback;
      } catch (error) {
        consoleLogger.error(error.message);
        return fallback;
      }
    },

    where: async function (clause = {}, limit) {
      try {
        const settings = await prisma.system_settings.findMany({
          where: clause,
          take: limit || undefined,
        });
        return settings;
      } catch (error) {
        consoleLogger.error(error.message);
        return [];
      }
    },

    isMultiUserMode: async function () {
      try {
        const setting = await ss.get({ label: "multi_user_mode" });
        return setting?.value === "true";
      } catch (error) {
        consoleLogger.error(error.message);
        return false;
      }
    },

    memoriesEnabled: async function () {
      try {
        const setting = await ss.get({ label: "memory_enabled" });
        return setting?.value === "true";
      } catch (error) {
        consoleLogger.error(error.message);
        return false;
      }
    },

    autoMemoriesEnabled: async function () {
      try {
        if (!(await ss.memoriesEnabled())) return false;
        const setting = await ss.get({ label: "memory_auto_extraction" });
        return !setting || setting.value === "true";
      } catch (error) {
        consoleLogger.error(error.message);
        return false;
      }
    },

    memoryAutoExtractionSetting: async function () {
      try {
        const setting = await ss.get({ label: "memory_auto_extraction" });
        return !setting || setting.value === "true";
      } catch (error) {
        consoleLogger.error(error.message);
        return true;
      }
    },

    isOnboardingComplete: async function () {
      // Onboarding is permanently disabled for this instance.
      // Hardcoded so the onboarding flow never appears, regardless of the
      // onboarding_complete DB flag.
      return true;
    },

    currentLogoFilename: async function () {
      try {
        const setting = await ss.get({ label: "logo_filename" });
        return setting?.value || null;
      } catch (error) {
        consoleLogger.error(error.message);
        return null;
      }
    },

    hasEmbeddings: async function () {
      try {
        const { Document } = require("../documents");
        const count = await Document.count({}, 1);
        return count > 0;
      } catch (error) {
        consoleLogger.error(error.message);
        return false;
      }
    },

    vectorDBPreferenceKeys: function () {
      return {
        // Pinecone DB Keys
        PineConeKey: !!process.env.PINECONE_API_KEY,
        PineConeIndex: process.env.PINECONE_INDEX,

        // Chroma DB Keys
        ChromaEndpoint: process.env.CHROMA_ENDPOINT,
        ChromaApiHeader: process.env.CHROMA_API_HEADER,
        ChromaApiKey: !!process.env.CHROMA_API_KEY,

        // ChromaCloud DB Keys
        ChromaCloudApiKey: !!process.env.CHROMACLOUD_API_KEY,
        ChromaCloudTenant: process.env.CHROMACLOUD_TENANT,
        ChromaCloudDatabase: process.env.CHROMACLOUD_DATABASE,

        // Weaviate DB Keys
        WeaviateEndpoint: process.env.WEAVIATE_ENDPOINT,
        WeaviateApiKey: !!process.env.WEAVIATE_API_KEY,

        // QDrant DB Keys
        QdrantEndpoint: process.env.QDRANT_ENDPOINT,
        QdrantApiKey: !!process.env.QDRANT_API_KEY,

        // Milvus DB Keys
        MilvusAddress: process.env.MILVUS_ADDRESS,
        MilvusUsername: process.env.MILVUS_USERNAME,
        MilvusPassword: !!process.env.MILVUS_PASSWORD,

        // Zilliz DB Keys
        ZillizEndpoint: process.env.ZILLIZ_ENDPOINT,
        ZillizApiToken: !!process.env.ZILLIZ_API_TOKEN,

        // AstraDB Keys
        AstraDBApplicationToken: !!process?.env?.ASTRA_DB_APPLICATION_TOKEN,
        AstraDBEndpoint: process?.env?.ASTRA_DB_ENDPOINT,

        // PGVector Keys
        PGVectorConnectionString: !!PGVector.connectionString() || false,
        PGVectorTableName: PGVector.tableName(),
      };
    },

    llmPreferenceKeys: function () {
      return {
        // OpenAI Keys
        OpenAiKey: !!process.env.OPEN_AI_KEY,
        OpenAiModelPref: process.env.OPEN_MODEL_PREF || "gpt-4o",

        // Azure + OpenAI Keys
        AzureOpenAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
        AzureOpenAiKey: !!process.env.AZURE_OPENAI_KEY,
        AzureOpenAiModelPref:
          process.env.AZURE_OPENAI_MODEL_PREF || process.env.OPEN_MODEL_PREF,
        AzureOpenAiEmbeddingModelPref: process.env.EMBEDDING_MODEL_PREF,
        AzureOpenAiTokenLimit: process.env.AZURE_OPENAI_TOKEN_LIMIT || 4096,
        AzureOpenAiModelType: process.env.AZURE_OPENAI_MODEL_TYPE || "default",

        // Anthropic Keys
        AnthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
        AnthropicModelPref:
          process.env.ANTHROPIC_MODEL_PREF || "claude-sonnet-4-6",
        AnthropicCacheControl: process.env.ANTHROPIC_CACHE_CONTROL || "none",

        // Gemini Keys
        GeminiLLMApiKey: !!process.env.GEMINI_API_KEY,
        GeminiLLMModelPref:
          process.env.GEMINI_LLM_MODEL_PREF || "gemini-2.0-flash-lite",
        GeminiSafetySetting:
          process.env.GEMINI_SAFETY_SETTING || "BLOCK_MEDIUM_AND_ABOVE",

        // LMStudio Keys
        LMStudioBasePath: process.env.LMSTUDIO_BASE_PATH,
        LMStudioTokenLimit: process.env.LMSTUDIO_MODEL_TOKEN_LIMIT || null,
        LMStudioModelPref: process.env.LMSTUDIO_MODEL_PREF,
        LMStudioAuthToken: !!process.env.LMSTUDIO_AUTH_TOKEN,

        // LocalAI Keys
        LocalAiApiKey: !!process.env.LOCAL_AI_API_KEY,
        LocalAiBasePath: process.env.LOCAL_AI_BASE_PATH,
        LocalAiModelPref: process.env.LOCAL_AI_MODEL_PREF,
        LocalAiTokenLimit: process.env.LOCAL_AI_MODEL_TOKEN_LIMIT,

        // Ollama LLM Keys
        OllamaLLMAuthToken: !!process.env.OLLAMA_AUTH_TOKEN,
        OllamaLLMBasePath: process.env.OLLAMA_BASE_PATH,
        OllamaLLMModelPref: process.env.OLLAMA_MODEL_PREF,
        OllamaLLMTokenLimit: process.env.OLLAMA_MODEL_TOKEN_LIMIT || null,
        OllamaLLMKeepAliveSeconds: process.env.OLLAMA_KEEP_ALIVE_TIMEOUT ?? 300,

        // Fireworks AI API Keys
        FireworksAiLLMApiKey: !!process.env.FIREWORKS_AI_LLM_API_KEY,
        FireworksAiLLMModelPref: process.env.FIREWORKS_AI_LLM_MODEL_PREF,

        // Mistral AI (API) Keys
        MistralApiKey: !!process.env.MISTRAL_API_KEY,
        MistralModelPref: process.env.MISTRAL_MODEL_PREF,

        // Groq AI API Keys
        GroqApiKey: !!process.env.GROQ_API_KEY,
        GroqModelPref: process.env.GROQ_MODEL_PREF,

        // HuggingFace Dedicated Inference
        HuggingFaceLLMEndpoint: process.env.HUGGING_FACE_LLM_ENDPOINT,
        HuggingFaceLLMAccessToken: !!process.env.HUGGING_FACE_LLM_API_KEY,
        HuggingFaceLLMTokenLimit: process.env.HUGGING_FACE_LLM_TOKEN_LIMIT,

        // LiteLLM Keys
        LiteLLMModelPref: process.env.LITE_LLM_MODEL_PREF,
        LiteLLMTokenLimit: process.env.LITE_LLM_MODEL_TOKEN_LIMIT,
        LiteLLMBasePath: process.env.LITE_LLM_BASE_PATH,
        LiteLLMApiKey: !!process.env.LITE_LLM_API_KEY,

        // Generic OpenAI Keys
        GenericOpenAiBasePath: process.env.GENERIC_OPEN_AI_BASE_PATH,
        GenericOpenAiModelPref: process.env.GENERIC_OPEN_AI_MODEL_PREF,
        GenericOpenAiTokenLimit: process.env.GENERIC_OPEN_AI_MODEL_TOKEN_LIMIT,
        GenericOpenAiKey: !!process.env.GENERIC_OPEN_AI_API_KEY,
        GenericOpenAiMaxTokens: process.env.GENERIC_OPEN_AI_MAX_TOKENS,

        // xAI LLM API Keys
        XAIApiKey: !!process.env.XAI_LLM_API_KEY,
        XAIModelPref: process.env.XAI_LLM_MODEL_PREF,

        // NVIDIA NIM Keys
        NvidiaNimLLMBasePath: process.env.NVIDIA_NIM_LLM_BASE_PATH,
        NvidiaNimLLMModelPref: process.env.NVIDIA_NIM_LLM_MODEL_PREF,
        NvidiaNimLLMTokenLimit: process.env.NVIDIA_NIM_LLM_MODEL_TOKEN_LIMIT,

        // OpenCode Zen Keys
        OpencodeZenBasePath: process.env.OPENCODE_ZEN_BASE_PATH,
        OpencodeZenModelPref: process.env.OPENCODE_ZEN_MODEL_PREF,
        OpencodeZenTokenLimit: process.env.OPENCODE_ZEN_MODEL_TOKEN_LIMIT,
        OpencodeZenApiKey: !!process.env.OPENCODE_ZEN_API_KEY,

        // Docker Model Runner Keys
        DockerModelRunnerBasePath: process.env.DOCKER_MODEL_RUNNER_BASE_PATH,
        DockerModelRunnerModelPref:
          process.env.DOCKER_MODEL_RUNNER_LLM_MODEL_PREF,
        DockerModelRunnerModelTokenLimit:
          process.env.DOCKER_MODEL_RUNNER_LLM_MODEL_TOKEN_LIMIT || 8192,
      };
    },

    agent_sql_connections: async function () {
      const setting = await ss.get({
        label: "agent_sql_connections",
      });
      if (!setting) return [];

      const parsedList = safeJsonParse(setting.value, []);
      if (!Array.isArray(parsedList)) return [];

      const connections = parsedList
        .map((conn) => {
          if (!conn || typeof conn !== "object" || !conn.engine) return null;
          try {
            let scheme = conn.engine;
            if (scheme === "sql-server") scheme = "mssql";
            if (scheme === "postgresql") scheme = "postgres";
            const parser = new ConnectionStringParser({ scheme });

            const parsedConn = parser.parse(conn.connectionString);
            return {
              ...conn,
              username: parsedConn.username,
              password: parsedConn.password,
              host: parsedConn.hosts?.[0]?.host,
              port: parsedConn.hosts?.[0]?.port,
              database: parsedConn.endpoint,
              scheme: parsedConn.scheme,
            };
          } catch (e) {
            consoleLogger.error(
              `Failed to parse SQL connection "${conn.database_id ?? conn.engine}":`,
              e.message,
            );
            return null;
          }
        })
        .filter((c) => c !== null);

      return connections;
    },

    getFeatureFlags: async function () {
      return {
        experimental_live_file_sync:
          (await ss.get({ label: "experimental_live_file_sync" }))
            ?.value === "enabled",
      };
    },

    /**
     * Get user configured Community Hub Settings
     * Connection key is used to authenticate with the Community Hub API
     * for your account.
     * @returns {Promise<{connectionKey: string}>}
     */
    hubSettings: async function () {
      try {
        const hubKey = await ss.get({ label: "hub_api_key" });
        return { connectionKey: hubKey?.value || null };
      } catch (error) {
        consoleLogger.error(error.message);
        return { connectionKey: null };
      }
    },
  };
}

module.exports = { createGetters };
