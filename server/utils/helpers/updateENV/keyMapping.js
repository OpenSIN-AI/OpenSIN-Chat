// SPDX-License-Identifier: MIT
// Purpose: KEY_MAPPING — maps frontend config keys to env vars, validators, and update handlers.
// Docs: server/utils/helpers/updateENV.doc.md
const consoleLogger = require("../../logger/console.js");

const { Telemetry } = require("../../../models/telemetry");
const {
  isNotEmpty,
  nonZero,
  isInteger,
  isValidURL,
  validOpenAIKey,
  validAnthropicApiKey,
  validLLMExternalBasePath,
  validOllamaLLMBasePath,
  supportedTTSProvider,
  supportedSTTProvider,
  validLocalWhisper,
  supportedLLM,
  supportedTranscriptionProvider,
  validGeminiSafetySetting,
  supportedEmbeddingModel,
  supportedVectorDB,
  validChromaURL,
  requiresForceMode,
  validDockerizedUrl,
  validHuggingFaceEndpoint,
  noRestrictedChars,
  looksLikePostgresConnectionString,
} = require("./validators");
const {
  handleVectorStoreReset,
  downloadEmbeddingModelIfRequired,
  validatePGVectorConnectionString,
  validatePGVectorTableName,
} = require("./handlers");

const KEY_MAPPING = {
  LLMProvider: {
    envKey: "LLM_PROVIDER",
    checks: [isNotEmpty, supportedLLM],
  },
  // Model Router Settings
  ModelRouterId: {
    envKey: "MODEL_ROUTER_ID",
    checks: [],
  },
  // OpenAI Settings
  OpenAiKey: {
    envKey: "OPEN_AI_KEY",
    checks: [isNotEmpty, validOpenAIKey],
  },
  OpenAiModelPref: {
    envKey: "OPEN_MODEL_PREF",
    checks: [isNotEmpty],
  },

  // Anthropic Settings
  AnthropicApiKey: {
    envKey: "ANTHROPIC_API_KEY",
    checks: [isNotEmpty, validAnthropicApiKey],
  },
  AnthropicModelPref: {
    envKey: "ANTHROPIC_MODEL_PREF",
    checks: [isNotEmpty],
  },
  AnthropicCacheControl: {
    envKey: "ANTHROPIC_CACHE_CONTROL",
    checks: [
      (input) =>
        ["none", "5m", "1h"].includes(input)
          ? null
          : "Invalid cache control. Must be one of: 5m, 1h.",
    ],
  },

  GeminiLLMApiKey: {
    envKey: "GEMINI_API_KEY",
    checks: [isNotEmpty],
  },
  GeminiLLMModelPref: {
    envKey: "GEMINI_LLM_MODEL_PREF",
    checks: [isNotEmpty],
  },
  GeminiSafetySetting: {
    envKey: "GEMINI_SAFETY_SETTING",
    checks: [validGeminiSafetySetting],
  },

  // LMStudio Settings
  LMStudioBasePath: {
    envKey: "LMSTUDIO_BASE_PATH",
    checks: [isNotEmpty, validLLMExternalBasePath, validDockerizedUrl],
  },
  LMStudioModelPref: {
    envKey: "LMSTUDIO_MODEL_PREF",
    checks: [],
  },
  LMStudioTokenLimit: {
    envKey: "LMSTUDIO_MODEL_TOKEN_LIMIT",
    checks: [],
  },
  LMStudioAuthToken: {
    envKey: "LMSTUDIO_AUTH_TOKEN",
    checks: [],
  },

  // LocalAI Settings
  LocalAiBasePath: {
    envKey: "LOCAL_AI_BASE_PATH",
    checks: [isNotEmpty, validLLMExternalBasePath, validDockerizedUrl],
  },
  LocalAiModelPref: {
    envKey: "LOCAL_AI_MODEL_PREF",
    checks: [],
  },
  LocalAiTokenLimit: {
    envKey: "LOCAL_AI_MODEL_TOKEN_LIMIT",
    checks: [nonZero],
  },
  LocalAiApiKey: {
    envKey: "LOCAL_AI_API_KEY",
    checks: [],
  },

  OllamaLLMBasePath: {
    envKey: "OLLAMA_BASE_PATH",
    checks: [isNotEmpty, validOllamaLLMBasePath, validDockerizedUrl],
  },
  OllamaLLMModelPref: {
    envKey: "OLLAMA_MODEL_PREF",
    checks: [],
  },
  OllamaLLMTokenLimit: {
    envKey: "OLLAMA_MODEL_TOKEN_LIMIT",
    checks: [],
  },
  OllamaLLMKeepAliveSeconds: {
    envKey: "OLLAMA_KEEP_ALIVE_TIMEOUT",
    checks: [isInteger],
  },
  OllamaLLMAuthToken: {
    envKey: "OLLAMA_AUTH_TOKEN",
    checks: [],
  },

  // Mistral AI API Settings
  MistralApiKey: {
    envKey: "MISTRAL_API_KEY",
    checks: [isNotEmpty],
  },
  MistralModelPref: {
    envKey: "MISTRAL_MODEL_PREF",
    checks: [isNotEmpty],
  },

  // Hugging Face LLM Inference Settings
  HuggingFaceLLMEndpoint: {
    envKey: "HUGGING_FACE_LLM_ENDPOINT",
    checks: [isNotEmpty, isValidURL, validHuggingFaceEndpoint],
  },
  HuggingFaceLLMAccessToken: {
    envKey: "HUGGING_FACE_LLM_API_KEY",
    checks: [isNotEmpty],
  },
  HuggingFaceLLMTokenLimit: {
    envKey: "HUGGING_FACE_LLM_TOKEN_LIMIT",
    checks: [nonZero],
  },

  // LiteLLM Settings
  LiteLLMModelPref: {
    envKey: "LITE_LLM_MODEL_PREF",
    checks: [isNotEmpty],
  },
  LiteLLMTokenLimit: {
    envKey: "LITE_LLM_MODEL_TOKEN_LIMIT",
    checks: [nonZero],
  },
  LiteLLMBasePath: {
    envKey: "LITE_LLM_BASE_PATH",
    checks: [isValidURL],
  },
  LiteLLMApiKey: {
    envKey: "LITE_LLM_API_KEY",
    checks: [],
  },

  // Generic OpenAI InferenceSettings
  GenericOpenAiBasePath: {
    envKey: "GENERIC_OPEN_AI_BASE_PATH",
    checks: [isValidURL],
  },
  GenericOpenAiModelPref: {
    envKey: "GENERIC_OPEN_AI_MODEL_PREF",
    checks: [isNotEmpty],
  },
  GenericOpenAiTokenLimit: {
    envKey: "GENERIC_OPEN_AI_MODEL_TOKEN_LIMIT",
    checks: [nonZero],
  },
  GenericOpenAiKey: {
    envKey: "GENERIC_OPEN_AI_API_KEY",
    checks: [],
  },
  GenericOpenAiMaxTokens: {
    envKey: "GENERIC_OPEN_AI_MAX_TOKENS",
    checks: [nonZero],
  },

  EmbeddingEngine: {
    envKey: "EMBEDDING_ENGINE",
    checks: [supportedEmbeddingModel],
    postUpdate: [handleVectorStoreReset],
  },
  EmbeddingBasePath: {
    envKey: "EMBEDDING_BASE_PATH",
    checks: [isNotEmpty, validDockerizedUrl],
  },
  EmbeddingModelPref: {
    envKey: "EMBEDDING_MODEL_PREF",
    checks: [isNotEmpty],
    postUpdate: [handleVectorStoreReset, downloadEmbeddingModelIfRequired],
  },
  EmbeddingModelMaxChunkLength: {
    envKey: "EMBEDDING_MODEL_MAX_CHUNK_LENGTH",
    checks: [nonZero],
  },
  EmbeddingOutputDimensions: {
    envKey: "EMBEDDING_OUTPUT_DIMENSIONS",
    checks: [],
  },
  OllamaEmbeddingBatchSize: {
    envKey: "OLLAMA_EMBEDDING_BATCH_SIZE",
    checks: [nonZero],
  },

  // Gemini Embedding Settings
  GeminiEmbeddingApiKey: {
    envKey: "GEMINI_EMBEDDING_API_KEY",
    checks: [isNotEmpty],
  },

  // Generic OpenAI Embedding Settings
  GenericOpenAiEmbeddingApiKey: {
    envKey: "GENERIC_OPEN_AI_EMBEDDING_API_KEY",
    checks: [],
  },
  GenericOpenAiEmbeddingMaxConcurrentChunks: {
    envKey: "GENERIC_OPEN_AI_EMBEDDING_MAX_CONCURRENT_CHUNKS",
    checks: [nonZero],
  },

  // Vector Database Selection Settings
  VectorDB: {
    envKey: "VECTOR_DB",
    checks: [isNotEmpty, supportedVectorDB],
    postUpdate: [handleVectorStoreReset],
  },

  // Chroma Options
  ChromaEndpoint: {
    envKey: "CHROMA_ENDPOINT",
    checks: [isValidURL, validChromaURL, validDockerizedUrl],
  },
  ChromaApiHeader: {
    envKey: "CHROMA_API_HEADER",
    checks: [],
  },
  ChromaApiKey: {
    envKey: "CHROMA_API_KEY",
    checks: [],
  },

  // ChromaCloud Options
  ChromaCloudApiKey: {
    envKey: "CHROMACLOUD_API_KEY",
    checks: [isNotEmpty],
  },
  ChromaCloudTenant: {
    envKey: "CHROMACLOUD_TENANT",
    checks: [isNotEmpty],
  },
  ChromaCloudDatabase: {
    envKey: "CHROMACLOUD_DATABASE",
    checks: [isNotEmpty],
  },

  // Weaviate Options
  WeaviateEndpoint: {
    envKey: "WEAVIATE_ENDPOINT",
    checks: [isValidURL, validDockerizedUrl],
  },
  WeaviateApiKey: {
    envKey: "WEAVIATE_API_KEY",
    checks: [],
  },

  // QDrant Options
  QdrantEndpoint: {
    envKey: "QDRANT_ENDPOINT",
    checks: [isValidURL, validDockerizedUrl],
  },
  QdrantApiKey: {
    envKey: "QDRANT_API_KEY",
    checks: [],
  },
  PineConeKey: {
    envKey: "PINECONE_API_KEY",
    checks: [],
  },
  PineConeIndex: {
    envKey: "PINECONE_INDEX",
    checks: [],
  },

  // Milvus Options
  MilvusAddress: {
    envKey: "MILVUS_ADDRESS",
    checks: [isValidURL, validDockerizedUrl],
  },
  MilvusUsername: {
    envKey: "MILVUS_USERNAME",
    checks: [isNotEmpty],
  },
  MilvusPassword: {
    envKey: "MILVUS_PASSWORD",
    checks: [isNotEmpty],
  },

  // Zilliz Cloud Options
  ZillizEndpoint: {
    envKey: "ZILLIZ_ENDPOINT",
    checks: [isValidURL],
  },
  ZillizApiToken: {
    envKey: "ZILLIZ_API_TOKEN",
    checks: [isNotEmpty],
  },

  // Astra DB Options
  AstraDBApplicationToken: {
    envKey: "ASTRA_DB_APPLICATION_TOKEN",
    checks: [isNotEmpty],
  },
  AstraDBEndpoint: {
    envKey: "ASTRA_DB_ENDPOINT",
    checks: [isNotEmpty],
  },

  /*
  PGVector Options
  - Does very simple validations - we should expand this in the future
  - to ensure the connection string is valid and the table name is valid
  - via direct query
  */
  PGVectorConnectionString: {
    envKey: "PGVECTOR_CONNECTION_STRING",
    checks: [isNotEmpty, looksLikePostgresConnectionString],
    preUpdate: [validatePGVectorConnectionString],
  },
  PGVectorTableName: {
    envKey: "PGVECTOR_TABLE_NAME",
    checks: [isNotEmpty],
    preUpdate: [validatePGVectorTableName],
  },

  // Fireworks AI Options
  FireworksAiLLMApiKey: {
    envKey: "FIREWORKS_AI_LLM_API_KEY",
    checks: [isNotEmpty],
  },
  FireworksAiLLMModelPref: {
    envKey: "FIREWORKS_AI_LLM_MODEL_PREF",
    checks: [isNotEmpty],
  },

  // Groq Options
  GroqApiKey: {
    envKey: "GROQ_API_KEY",
    checks: [isNotEmpty],
  },
  GroqModelPref: {
    envKey: "GROQ_MODEL_PREF",
    checks: [isNotEmpty],
  },

  // VoyageAi Options
  VoyageAiApiKey: {
    envKey: "VOYAGEAI_API_KEY",
    checks: [isNotEmpty],
  },

  // Whisper (transcription) providers
  WhisperProvider: {
    envKey: "WHISPER_PROVIDER",
    checks: [isNotEmpty, supportedTranscriptionProvider],
    postUpdate: [],
  },
  WhisperModelPref: {
    envKey: "WHISPER_MODEL_PREF",
    checks: [validLocalWhisper],
    postUpdate: [],
  },

  // System Settings
  AuthToken: {
    envKey: "AUTH_TOKEN",
    checks: [requiresForceMode, noRestrictedChars],
  },
  JWTSecret: {
    envKey: "JWT_SECRET",
    checks: [requiresForceMode],
  },
  DisableTelemetry: {
    envKey: "DISABLE_TELEMETRY",
    checks: [],
    preUpdate: [
      (_, __, nextValue) => {
        if (nextValue === "true")
          Telemetry.sendTelemetry("telemetry_disabled").catch((err) => {
            consoleLogger.error("Telemetry error:", err.message);
          });
      },
    ],
  },

  // Agent Integration ENVs
  AgentSerpApiKey: {
    envKey: "AGENT_SERPAPI_API_KEY",
    checks: [],
  },
  AgentSerpApiEngine: {
    envKey: "AGENT_SERPAPI_ENGINE",
    checks: [],
  },
  AgentSearchApiKey: {
    envKey: "AGENT_SEARCHAPI_API_KEY",
    checks: [],
  },
  AgentSearchApiEngine: {
    envKey: "AGENT_SEARCHAPI_ENGINE",
    checks: [],
  },
  AgentSerperApiKey: {
    envKey: "AGENT_SERPER_DEV_KEY",
    checks: [],
  },
  AgentBingSearchApiKey: {
    envKey: "AGENT_BING_SEARCH_API_KEY",
    checks: [],
  },
  AgentBaiduSearchApiKey: {
    envKey: "AGENT_BAIDU_SEARCH_API_KEY",
    checks: [],
  },
  AgentSerplyApiKey: {
    envKey: "AGENT_SERPLY_API_KEY",
    checks: [],
  },
  AgentSearXNGApiUrl: {
    envKey: "AGENT_SEARXNG_API_URL",
    checks: [],
  },
  AgentTavilyApiKey: {
    envKey: "AGENT_TAVILY_API_KEY",
    checks: [],
  },
  AgentExaApiKey: {
    envKey: "AGENT_EXA_API_KEY",
    checks: [],
  },
  AgentPerplexityApiKey: {
    envKey: "AGENT_PERPLEXITY_API_KEY",
    checks: [],
  },

  // TTS/STT Integration ENVS
  TextToSpeechProvider: {
    envKey: "TTS_PROVIDER",
    checks: [supportedTTSProvider],
  },

  // TTS OpenAI
  TTSOpenAIKey: {
    envKey: "TTS_OPEN_AI_KEY",
    checks: [validOpenAIKey],
  },
  TTSOpenAIVoiceModel: {
    envKey: "TTS_OPEN_AI_VOICE_MODEL",
    checks: [],
  },

  // TTS ElevenLabs
  TTSElevenLabsKey: {
    envKey: "TTS_ELEVEN_LABS_KEY",
    checks: [isNotEmpty],
  },
  TTSElevenLabsVoiceModel: {
    envKey: "TTS_ELEVEN_LABS_VOICE_MODEL",
    checks: [],
  },

  // PiperTTS Local
  TTSPiperTTSVoiceModel: {
    envKey: "TTS_PIPER_VOICE_MODEL",
    checks: [],
  },

  // OpenAI Generic TTS
  TTSOpenAICompatibleKey: {
    envKey: "TTS_OPEN_AI_COMPATIBLE_KEY",
    checks: [],
  },
  TTSOpenAICompatibleModel: {
    envKey: "TTS_OPEN_AI_COMPATIBLE_MODEL",
    checks: [],
  },
  TTSOpenAICompatibleVoiceModel: {
    envKey: "TTS_OPEN_AI_COMPATIBLE_VOICE_MODEL",
    checks: [isNotEmpty],
  },
  TTSOpenAICompatibleEndpoint: {
    envKey: "TTS_OPEN_AI_COMPATIBLE_ENDPOINT",
    checks: [isValidURL],
  },

  // Kokoro TTS (self-hosted kokoro-fastapi)
  TTSKokoroEndpoint: {
    envKey: "TTS_KOKORO_ENDPOINT",
    checks: [isValidURL],
  },
  TTSKokoroKey: {
    envKey: "TTS_KOKORO_KEY",
    checks: [],
  },
  TTSKokoroVoiceModel: {
    envKey: "TTS_KOKORO_VOICE_MODEL",
    checks: [isNotEmpty],
  },

  // NVIDIA NIM TTS
  TTSNvidiaNimApiKey: {
    envKey: "TTS_NVIDIA_NIM_API_KEY",
    checks: [isNotEmpty],
  },
  TTSNvidiaNimEndpoint: {
    envKey: "TTS_NVIDIA_NIM_ENDPOINT",
    checks: [],
  },
  TTSNvidiaNimModel: {
    envKey: "TTS_NVIDIA_NIM_MODEL",
    checks: [],
  },
  TTSNvidiaNimVoiceModel: {
    envKey: "TTS_NVIDIA_NIM_VOICE_MODEL",
    checks: [],
  },

  // cvoice.ai TTS (free, 20k+ character voices incl. German curated voices)
  // API key MUST stay server-side — never expose via NEXT_PUBLIC_ or similar.
  TTSCvoiceApiKey: {
    envKey: "TTS_CVOICE_API_KEY",
    checks: [isNotEmpty],
  },
  TTSCvoiceEndpoint: {
    envKey: "TTS_CVOICE_ENDPOINT",
    checks: [],
  },
  TTSCvoiceVoiceModel: {
    envKey: "TTS_CVOICE_VOICE_MODEL",
    checks: [],
  },
  TTSCvoiceCustomVoiceModel: {
    envKey: "TTS_CVOICE_CUSTOM_VOICE_MODEL",
    checks: [],
  },
  TTSCvoicePersonName: {
    envKey: "TTS_CVOICE_PERSON_NAME",
    checks: [],
  },
  TTSCvoicePersonSlug: {
    envKey: "TTS_CVOICE_PERSON_SLUG",
    checks: [],
  },

  // STT Selection
  SpeechToTextProvider: {
    envKey: "STT_PROVIDER",
    checks: [supportedSTTProvider],
  },

  // STT OpenAI
  STTOpenAIModel: {
    envKey: "STT_OPEN_AI_MODEL",
    checks: [],
  },

  // STT Deepgram
  STTDeepgramApiKey: {
    envKey: "STT_DEEPGRAM_API_KEY",
    checks: [isNotEmpty],
  },
  STTDeepgramModel: {
    envKey: "STT_DEEPGRAM_MODEL",
    checks: [isNotEmpty],
  },

  // STT OpenAI Generic
  STTOpenAICompatibleKey: {
    envKey: "STT_OPEN_AI_COMPATIBLE_KEY",
    checks: [],
  },
  STTOpenAICompatibleModel: {
    envKey: "STT_OPEN_AI_COMPATIBLE_MODEL",
    checks: [],
  },
  STTOpenAICompatibleEndpoint: {
    envKey: "STT_OPEN_AI_COMPATIBLE_ENDPOINT",
    checks: [isValidURL],
  },

  // xAI Options
  XAIApiKey: {
    envKey: "XAI_LLM_API_KEY",
    checks: [isNotEmpty],
  },
  XAIModelPref: {
    envKey: "XAI_LLM_MODEL_PREF",
    checks: [isNotEmpty],
  },

  // Nvidia NIM Options
  NvidiaNimLLMBasePath: {
    envKey: "NVIDIA_NIM_LLM_BASE_PATH",
    checks: [isValidURL],
    postUpdate: [
      (_, __, nextValue) => {
        const {
          parseNvidiaNimBasePath,
        } = require("../../AiProviders/nvidiaNim");
        process.env.NVIDIA_NIM_LLM_BASE_PATH =
          parseNvidiaNimBasePath(nextValue);
      },
    ],
  },
  NvidiaNimLLMModelPref: {
    envKey: "NVIDIA_NIM_LLM_MODEL_PREF",
    checks: [],
    postUpdate: [
      async (_, __, nextValue) => {
        const { NvidiaNimLLM } = require("../../AiProviders/nvidiaNim");
        await NvidiaNimLLM.setModelTokenLimit(nextValue);
      },
    ],
  },

  // OpenCode Zen Options
  OpencodeZenBasePath: {
    envKey: "OPENCODE_ZEN_BASE_PATH",
    checks: [isValidURL],
    postUpdate: [
      (_, __, nextValue) => {
        const {
          parseOpencodeZenBasePath,
        } = require("../../AiProviders/opencodeZen");
        process.env.OPENCODE_ZEN_BASE_PATH =
          parseOpencodeZenBasePath(nextValue);
      },
    ],
  },
  OpencodeZenModelPref: {
    envKey: "OPENCODE_ZEN_MODEL_PREF",
    checks: [],
    postUpdate: [
      async (_, __, nextValue) => {
        const { OpencodeZenLLM } = require("../../AiProviders/opencodeZen");
        await OpencodeZenLLM.setModelTokenLimit(nextValue);
      },
    ],
  },
  OpencodeZenApiKey: {
    envKey: "OPENCODE_ZEN_API_KEY",
    checks: [isNotEmpty],
  },

  // Docker Model Runner Options
  DockerModelRunnerBasePath: {
    envKey: "DOCKER_MODEL_RUNNER_BASE_PATH",
    checks: [isValidURL],
  },
  DockerModelRunnerModelPref: {
    envKey: "DOCKER_MODEL_RUNNER_LLM_MODEL_PREF",
    checks: [isNotEmpty],
  },
  DockerModelRunnerModelTokenLimit: {
    envKey: "DOCKER_MODEL_RUNNER_LLM_MODEL_TOKEN_LIMIT",
    checks: [nonZero],
  },

  // Agent Skill Settings
  AgentSkillMaxToolCalls: {
    envKey: "AGENT_MAX_TOOL_CALLS",
    checks: [nonZero],
  },
  AgentSkillRerankerEnabled: {
    envKey: "AGENT_SKILL_RERANKER_ENABLED",
    checks: [],
  },
  AgentSkillRerankerTopN: {
    envKey: "AGENT_SKILL_RERANKER_TOP_N",
    checks: [nonZero],
  },
};

module.exports = { KEY_MAPPING };
