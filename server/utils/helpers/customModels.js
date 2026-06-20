// SPDX-License-Identifier: MIT
const { fireworksAiModels } = require("../AiProviders/fireworksAi");
const { parseLMStudioBasePath } = require("../AiProviders/lmStudio");
const { parseNvidiaNimBasePath } = require("../AiProviders/nvidiaNim");
const { parseOpencodeZenBasePath } = require("../AiProviders/opencodeZen");
const { GeminiLLM } = require("../AiProviders/gemini");
const { getDockerModels } = require("../AiProviders/dockerModelRunner");

const SUPPORT_CUSTOM_MODELS = [
  "openai",
  "anthropic",
  "localai",
  "ollama",
  "fireworksai",
  "nvidia-nim",
  "mistral",
  "lmstudio",
  "litellm",
  "groq",
  "xai",
  "gemini",
  "docker-model-runner",
  "opencode-zen",
  "generic-openai",
  // Embedding Engines
  "native-embedder",
  // STT Engines
  "openai-stt",
  "deepgram-stt",
  // TTS Engines
  "kokoro-tts",
];

async function getCustomModels(provider = "", apiKey = null, basePath = null) {
  if (!SUPPORT_CUSTOM_MODELS.includes(provider))
    return { models: [], error: "Invalid provider for custom models" };

  switch (provider) {
    case "openai":
      return await openAiModels(apiKey);
    case "openai-stt":
      return await openAiSttModels(apiKey);
    case "anthropic":
      return await anthropicModels(apiKey);
    case "localai":
      return await localAIModels(basePath, apiKey);
    case "ollama":
      return await ollamaAIModels(basePath, apiKey);
    case "fireworksai":
      return await getFireworksAiModels(apiKey);
    case "mistral":
      return await getMistralModels(apiKey);
    case "lmstudio":
      return await getLMStudioModels(basePath, apiKey);
    case "litellm":
      return await liteLLMModels(basePath, apiKey);
    case "groq":
      return await getGroqAiModels(apiKey);
    case "xai":
      return await getXAIModels(apiKey);
    case "nvidia-nim":
      return await getNvidiaNimModels(basePath);
    case "gemini":
      return await getGeminiModels(apiKey);
    case "native-embedder":
      return await getNativeEmbedderModels();
    case "docker-model-runner":
      return await getDockerModelRunnerModels(basePath);
    case "opencode-zen":
      return await getOpencodeZenModels();
    case "generic-openai":
      return await getGenericOpenAiModels(basePath, apiKey);
    case "deepgram-stt":
      return await getDeepgramSTTModels(apiKey);
    case "kokoro-tts":
      return await kokoroTtsVoices(basePath, apiKey);
    default:
      return { models: [], error: "Invalid provider for custom models" };
  }
}

async function openAiModels(apiKey = null) {
  const { OpenAI: OpenAIApi } = require("openai");
  const key = apiKey || process.env.OPEN_AI_KEY;
  if (!key) return { models: [], error: "No API key provided" };
  const openai = new OpenAIApi({
    apiKey: key,
  });
  const allModels = await openai.models
    .list()
    .then((results) => results.data)
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(`OpenAI:listModels`, e.message);
      return [
        {
          name: "gpt-3.5-turbo",
          id: "gpt-3.5-turbo",
          object: "model",
          created: 1677610602,
          owned_by: "openai",
          organization: "OpenAi",
        },
        {
          name: "gpt-4o",
          id: "gpt-4o",
          object: "model",
          created: 1677610602,
          owned_by: "openai",
          organization: "OpenAi",
        },
        {
          name: "gpt-4",
          id: "gpt-4",
          object: "model",
          created: 1687882411,
          owned_by: "openai",
          organization: "OpenAi",
        },
        {
          name: "gpt-4-turbo",
          id: "gpt-4-turbo",
          object: "model",
          created: 1712361441,
          owned_by: "system",
          organization: "OpenAi",
        },
        {
          name: "gpt-4-32k",
          id: "gpt-4-32k",
          object: "model",
          created: 1687979321,
          owned_by: "openai",
          organization: "OpenAi",
        },
        {
          name: "gpt-3.5-turbo-16k",
          id: "gpt-3.5-turbo-16k",
          object: "model",
          created: 1683758102,
          owned_by: "openai-internal",
          organization: "OpenAi",
        },
      ];
    });

  const gpts = allModels
    .filter(
      (model) =>
        (model.id.includes("gpt") && !model.id.startsWith("ft:")) ||
        model.id.startsWith("o"), // o1, o1-mini, o3, etc
    )
    .filter(
      (model) =>
        !model.id.includes("vision") &&
        !model.id.includes("instruct") &&
        !model.id.includes("audio") &&
        !model.id.includes("realtime") &&
        !model.id.includes("image") &&
        !model.id.includes("moderation") &&
        !model.id.includes("transcribe"),
    )
    .map((model) => {
      return {
        ...model,
        name: model.id,
        organization: "OpenAi",
      };
    });

  const customModels = allModels
    .filter(
      (model) =>
        !model.owned_by.includes("openai") && model.owned_by !== "system",
    )
    .map((model) => {
      return {
        ...model,
        name: model.id,
        organization: "Your Fine-Tunes",
      };
    });

  // Api Key was successful so lets save it for future uses
  if ((gpts.length > 0 || customModels.length > 0) && !!apiKey)
    process.env.OPEN_AI_KEY = apiKey;
  return { models: [...gpts, ...customModels], error: null };
}

async function openAiSttModels(apiKey = null) {
  const fallback = [
    { id: "whisper-1", name: "whisper-1", organization: "OpenAi" },
    {
      id: "gpt-4o-transcribe",
      name: "gpt-4o-transcribe",
      organization: "OpenAi",
    },
    {
      id: "gpt-4o-mini-transcribe",
      name: "gpt-4o-mini-transcribe",
      organization: "OpenAi",
    },
  ];

  const { OpenAI: OpenAIApi } = require("openai");
  const sttKey = apiKey || process.env.OPEN_AI_KEY;
  if (!sttKey) return { models: fallback, error: null };
  const openai = new OpenAIApi({
    apiKey: sttKey,
  });

  const allModels = await openai.models
    .list()
    .then((results) => results.data)
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(`OpenAI:listModels (stt)`, e.message);
      return null;
    });

  if (!allModels) return { models: fallback, error: null };

  // The /v1/models response has no category/type field, so we filter by id.
  // Realtime variants use a separate WebSocket API and are not compatible
  // with the audio.transcriptions.create endpoint we use server-side.
  const models = allModels
    .filter(
      (m) =>
        (m.id.includes("whisper") || m.id.includes("transcribe")) &&
        !m.id.includes("realtime"),
    )
    .map((m) => ({ ...m, name: m.id, organization: "OpenAi" }));

  return { models: models.length ? models : fallback, error: null };
}

async function anthropicModels(_apiKey = null) {
  const apiKey =
    _apiKey === true
      ? process.env.ANTHROPIC_API_KEY
      : _apiKey || process.env.ANTHROPIC_API_KEY || null;
  if (!apiKey) return { models: [], error: "No API key provided" };
  const AnthropicAI = require("@anthropic-ai/sdk");
  const anthropic = new AnthropicAI({ apiKey });
  const models = await anthropic.models
    .list()
    .then((results) => results.data)
    .then((models) => {
      return models
        .filter((model) => model.type === "model")
        .map((model) => {
          return {
            id: model.id,
            name: model.display_name,
          };
        });
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(`Anthropic:listModels`, e.message);
      return [];
    });

  // Api Key was successful so lets save it for future uses
  if (models.length > 0 && !!apiKey) process.env.ANTHROPIC_API_KEY = apiKey;
  return { models, error: null };
}

async function localAIModels(basePath = null, apiKey = null) {
  const { OpenAI: OpenAIApi } = require("openai");
  const openai = new OpenAIApi({
    baseURL: basePath || process.env.LOCAL_AI_BASE_PATH,
    apiKey: apiKey || process.env.LOCAL_AI_API_KEY || "no-key-required",
  });
  const models = await openai.models
    .list()
    .then((results) => results.data)
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(`LocalAI:listModels`, e.message);
      return [];
    });

  // Api Key was successful so lets save it for future uses
  if (models.length > 0 && !!apiKey) process.env.LOCAL_AI_API_KEY = apiKey;
  return { models, error: null };
}

async function getGroqAiModels(_apiKey = null) {
  const { OpenAI: OpenAIApi } = require("openai");
  const apiKey =
    _apiKey === true
      ? process.env.GROQ_API_KEY
      : _apiKey || process.env.GROQ_API_KEY || null;
  if (!apiKey) return { models: [], error: "No API key provided" };
  const openai = new OpenAIApi({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });
  const models = (
    await openai.models
      .list()
      .then((results) => results.data)
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(`GroqAi:listModels`, e.message);
        return [];
      })
  ).filter(
    (model) => !model.id.includes("whisper") && !model.id.includes("tool-use"),
  );

  // Api Key was successful so lets save it for future uses
  if (models.length > 0 && !!apiKey) process.env.GROQ_API_KEY = apiKey;
  return { models, error: null };
}

async function liteLLMModels(basePath = null, apiKey = null) {
  const { OpenAI: OpenAIApi } = require("openai");
  const openai = new OpenAIApi({
    baseURL: basePath || process.env.LITE_LLM_BASE_PATH,
    apiKey: apiKey || process.env.LITE_LLM_API_KEY || "no-key-required",
  });
  const models = await openai.models
    .list()
    .then((results) => results.data)
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(`LiteLLM:listModels`, e.message);
      return [];
    });

  // Api Key was successful so lets save it for future uses
  if (models.length > 0 && !!apiKey) process.env.LITE_LLM_API_KEY = apiKey;
  return { models, error: null };
}

async function getLMStudioModels(basePath = null, _apiKey = null) {
  try {
    const apiKey =
      _apiKey === true
        ? process.env.LMSTUDIO_AUTH_TOKEN
        : _apiKey || process.env.LMSTUDIO_AUTH_TOKEN || null;

    const { OpenAI: OpenAIApi } = require("openai");
    const openai = new OpenAIApi({
      baseURL: parseLMStudioBasePath(
        basePath || process.env.LMSTUDIO_BASE_PATH,
      ),
      apiKey: apiKey || "no-key-required",
    });
    const models = await openai.models
      .list()
      .then((results) => results.data)
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(`LMStudio:listModels`, e.message);
        return [];
      });

    return { models, error: null };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`LMStudio:getLMStudioModels`, e.message);
    return { models: [], error: "Could not fetch LMStudio Models" };
  }
}

async function ollamaAIModels(basePath = null, _authToken = null) {
  let url;
  try {
    let urlPath = basePath ?? process.env.OLLAMA_BASE_PATH;
    new URL(urlPath);
    if (urlPath.split("").slice(-1)?.[0] === "/")
      throw new Error("BasePath Cannot end in /!");
    url = urlPath;
  } catch {
    return { models: [], error: "Not a valid URL." };
  }

  const authToken = _authToken || process.env.OLLAMA_AUTH_TOKEN || null;
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const models = await fetch(`${url}/api/tags`, { headers: headers })
    .then((res) => {
      if (!res.ok)
        throw new Error(`Could not reach Ollama server! ${res.status}`);
      return res.json();
    })
    .then((data) => data?.models || [])
    .then((models) =>
      models.map((model) => {
        return { id: model.name };
      }),
    )
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      return [];
    });

  // Api Key was successful so lets save it for future uses
  if (models.length > 0 && !!authToken)
    process.env.OLLAMA_AUTH_TOKEN = authToken;
  return { models, error: null };
}

async function getFireworksAiModels(apiKey = null) {
  const knownModels = await fireworksAiModels(apiKey);
  if (Object.keys(knownModels).length === 0) return { models: [], error: null };

  const models = Object.values(knownModels).map((model) => {
    return {
      id: model.id,
      organization: model.organization,
      name: model.name,
    };
  });
  return { models, error: null };
}

async function getMistralModels(apiKey = null) {
  const { OpenAI: OpenAIApi } = require("openai");
  const key = apiKey || process.env.MISTRAL_API_KEY || null;
  if (!key) return { models: [], error: "No API key provided" };
  const openai = new OpenAIApi({
    apiKey: key,
    baseURL: "https://api.mistral.ai/v1",
  });
  const models = await openai.models
    .list()
    .then((results) =>
      results.data.filter((model) => !model.id.includes("embed")),
    )
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(`Mistral:listModels`, e.message);
      return [];
    });

  // Api Key was successful so lets save it for future uses
  if (models.length > 0 && !!apiKey) process.env.MISTRAL_API_KEY = apiKey;
  return { models, error: null };
}

async function getXAIModels(_apiKey = null) {
  const { OpenAI: OpenAIApi } = require("openai");
  const apiKey =
    _apiKey === true
      ? process.env.XAI_LLM_API_KEY
      : _apiKey || process.env.XAI_LLM_API_KEY || null;
  if (!apiKey) return { models: [], error: "No API key provided" };
  const openai = new OpenAIApi({
    baseURL: "https://api.x.ai/v1",
    apiKey,
  });
  const models = await openai.models
    .list()
    .then((results) => results.data)
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(`XAI:listModels`, e.message);
      return [
        {
          created: 1725148800,
          id: "grok-beta",
          object: "model",
          owned_by: "xai",
        },
      ];
    });

  // Api Key was successful so lets save it for future uses
  if (models.length > 0 && !!apiKey) process.env.XAI_LLM_API_KEY = apiKey;
  return { models, error: null };
}

async function getNvidiaNimModels(basePath = null) {
  try {
    const { OpenAI: OpenAIApi } = require("openai");
    const openai = new OpenAIApi({
      baseURL: parseNvidiaNimBasePath(
        basePath ?? process.env.NVIDIA_NIM_LLM_BASE_PATH,
      ),
      apiKey: process.env.NVIDIA_NIM_LLM_API_KEY || "nvidia-nim",
    });
    const modelResponse = await openai.models
      .list()
      .then((results) => results.data)
      .catch((e) => {
        throw new Error(e.message);
      });

    const models = modelResponse.map((model) => {
      return {
        id: model.id,
        name: model.id,
        organization: model.owned_by,
      };
    });

    return { models, error: null };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`NVIDIA NIM:getNvidiaNimModels`, e.message);
    return { models: [], error: "Could not fetch NVIDIA NIM Models" };
  }
}

async function getGeminiModels(_apiKey = null) {
  const apiKey =
    _apiKey === true
      ? process.env.GEMINI_API_KEY
      : _apiKey || process.env.GEMINI_API_KEY || null;
  const models = await GeminiLLM.fetchModels(apiKey);
  // Api Key was successful so lets save it for future uses
  if (models.length > 0 && !!apiKey) process.env.GEMINI_API_KEY = apiKey;
  return { models, error: null };
}

function getNativeEmbedderModels() {
  const { NativeEmbedder } = require("../EmbeddingEngines/native");
  return { models: NativeEmbedder.availableModels(), error: null };
}

/**
 * Get Cohere models
 * @param {string} _apiKey - The API key to use
 * @param {'chat' | 'embed'} type - The type of model to get
 * @returns {Promise<{models: Array<{id: string, organization: string, name: string}>, error: string | null}>}
 */

async function getDockerModelRunnerModels(basePath = null) {
  try {
    const models = await getDockerModels(basePath);
    return { models, error: null };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`DockerModelRunner:getDockerModelRunnerModels`, e.message);
    return {
      models: [],
      error: "Could not fetch Docker Model Runner Models",
    };
  }
}

/**
 * Get Deepgram STT models from the Management API.
 * https://api.deepgram.com/v1/models returns { stt: [...], tts: [...] }.
 * @param {string} _apiKey - Deepgram API key. Falls back to STT_DEEPGRAM_API_KEY.
 * @returns {Promise<{models: Array<{id: string, name: string, organization: string}>, error: string | null}>}
 */
async function getDeepgramSTTModels(_apiKey = null) {
  const apiKey =
    _apiKey === true
      ? process.env.STT_DEEPGRAM_API_KEY
      : _apiKey || process.env.STT_DEEPGRAM_API_KEY || null;
  if (!apiKey)
    return { models: [], error: "No Deepgram API key was provided." };

  try {
    const response = await fetch("https://api.deepgram.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!response.ok) throw new Error(`Deepgram returned ${response.status}`);

    let models = new Map();
    const data = await response.json();
    (data?.stt ?? [])
      .filter((m) => m.batch !== false)
      .forEach((m) => {
        if (models.has(m.canonical_name)) return;
        models.set(m.canonical_name, {
          id: m.canonical_name,
          name: m.canonical_name,
          organization: "Deepgram",
        });
      });

    models = Array.from(models.values());
    // Api Key was successful so lets save it for future uses
    if (models.length > 0 && _apiKey) process.env.STT_DEEPGRAM_API_KEY = apiKey;
    return { models, error: null };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Deepgram:getDeepgramSTTModels`, e.message);
    return { models: [], error: "Could not fetch Deepgram STT models" };
  }
}

async function getOpencodeZenModels() {
  const fallback = [
    {
      id: "nemotron-3-ultra-free",
      name: "Nemotron 3 Ultra (Free)",
      organization: "NVIDIA",
    },
    {
      id: "deepseek-v4-flash-free",
      name: "DeepSeek V4 Flash (Free)",
      organization: "DeepSeek",
    },
    { id: "mimo-v2.5-free", name: "MiMo V2.5 (Free)", organization: "MiMo" },
    { id: "big-pickle", name: "Big Pickle (Free)", organization: "Stealth" },
    { id: "gpt-5.5", name: "GPT 5.5", organization: "OpenAI" },
    {
      id: "claude-sonnet-4.6",
      name: "Claude Opus 4.6",
      organization: "Anthropic",
    },
    {
      id: "gemini-3.5-flash",
      name: "Gemini 3.5 Flash",
      organization: "Google",
    },
    { id: "qwen3.7-max", name: "Qwen 3.7 Max", organization: "Alibaba" },
    {
      id: "deepseek-v4-flash",
      name: "DeepSeek V4 Flash",
      organization: "DeepSeek",
    },
    { id: "kimi-k2.6", name: "Kimi K2.6", organization: "Moonshot" },
  ];

  // Without a configured base path the OpenAI client would fall back to the
  // default OpenAI endpoint and hang/fail with the wrong credentials, leaving
  // the model dropdown stuck on "waiting for models". Return the static list.
  if (!process.env.OPENCODE_ZEN_BASE_PATH)
    return { models: fallback, error: null };

  try {
    const { OpenAI: OpenAIApi } = require("openai");
    const openai = new OpenAIApi({
      baseURL: parseOpencodeZenBasePath(process.env.OPENCODE_ZEN_BASE_PATH),
      apiKey: process.env.OPENCODE_ZEN_API_KEY || "no-key-required",
      // Fail fast so the UI never hangs waiting on a slow/unreachable endpoint.
      timeout: 15 * 1000,
      maxRetries: 1,
    });
    const models = await openai.models
      .list()
      .then((results) => results.data)
      .then((models) =>
        models.map((model) => ({
          id: model.id,
          name: model.id,
          organization: model.owned_by ?? "OpenCode Zen",
        })),
      )
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(`OpencodeZen:listModels`, e.message);
        return [];
      });

    if (models.length > 0) return { models, error: null };
    return { models: fallback, error: null };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`OpencodeZen:getOpencodeZenModels`, e.message);
    return { models: fallback, error: null };
  }
}

const SINATOR_ROUTER_HOSTS = ["sinatorpool-router.delqhi.com"];

const FIREWORKS_GENERIC_OPENAI_FALLBACK_MODELS = [
  {
    id: "accounts/fireworks/models/deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/minimax-m3",
    name: "MiniMax M3 (Vision)",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/kimi-k2p7-code",
    name: "Kimi K2.7 Code (Vision)",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/llama-v3p1-405b-instruct",
    name: "Llama 3.1 405B Instruct",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/llama-v3p1-70b-instruct",
    name: "Llama 3.1 70B Instruct",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/llama-v3p1-8b-instruct",
    name: "Llama 3.1 8B Instruct",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/llama-v3p2-90b-vision-instruct",
    name: "Llama 3.2 90B Vision Instruct",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/llama-v3p2-11b-vision-instruct",
    name: "Llama 3.2 11B Vision Instruct",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/llama4-maverick-instruct",
    name: "Llama 4 Maverick Instruct",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/llama4-scout-instruct",
    name: "Llama 4 Scout Instruct",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/qwen2p5-72b-instruct",
    name: "Qwen2.5 72B Instruct",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/qwen2p5-14b-instruct",
    name: "Qwen2.5 14B Instruct",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/qwen2p5-7b-instruct",
    name: "Qwen2.5 7B Instruct",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/qwen3-235b-a22b",
    name: "Qwen3 235B A22B",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/mixtral-8x22b-instruct",
    name: "Mixtral 8x22B Instruct",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/mixtral-8x7b-instruct",
    name: "Mixtral 8x7B Instruct",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/deepseek-v3",
    name: "DeepSeek V3",
    organization: "Fireworks",
  },
  {
    id: "accounts/fireworks/models/deepseek-r1",
    name: "DeepSeek R1",
    organization: "Fireworks",
  },
];

function isSinatorRouter(basePath = "") {
  if (!basePath || typeof basePath !== "string") return false;
  return SINATOR_ROUTER_HOSTS.some((host) =>
    basePath.toLowerCase().includes(host),
  );
}

async function getGenericOpenAiModels(basePath = null, apiKey = null) {
  const resolvedBasePath = basePath || process.env.GENERIC_OPEN_AI_BASE_PATH;

  // The SINator Fireworks pool router blocks the OpenAI-compatible /models
  // endpoint with HTTP 403. Return the static fallback list immediately so the
  // settings UI model dropdown stays populated and the production logs stay
  // free of non-fatal 403 noise.
  if (isSinatorRouter(resolvedBasePath))
    return { models: FIREWORKS_GENERIC_OPENAI_FALLBACK_MODELS, error: null };

  try {
    const { OpenAI: OpenAIApi } = require("openai");
    const openai = new OpenAIApi({
      baseURL: resolvedBasePath,
      apiKey: apiKey || process.env.GENERIC_OPEN_AI_API_KEY || "no-key-required",
    });
    const models = await openai.models
      .list()
      .then((results) => results.data)
      .then((models) =>
        models.map((model) => ({
          id: model.id,
          name: model.id,
          organization: model.owned_by ?? "generic-openai",
        })),
      )
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(`GenericOpenAI:listModels`, e.message);
        return null;
      });

    if (!models || models.length === 0)
      return { models: FIREWORKS_GENERIC_OPENAI_FALLBACK_MODELS, error: null };

    if (!!apiKey) process.env.GENERIC_OPEN_AI_API_KEY = apiKey;
    return { models, error: null };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`GenericOpenAI:getGenericOpenAiModels`, e.message);
    return { models: FIREWORKS_GENERIC_OPENAI_FALLBACK_MODELS, error: null };
  }
}

/**
 * Pulls the live voice list from a self-hosted kokoro-fastapi server's
 * /audio/voices endpoint. basePath is the OpenAI-compatible base URL the
 * user pointed at their kokoro instance (e.g. http://localhost:8880/v1).
 * @param {string} basePath - The base path to the Kokoro instance.
 * @param {string} apiKey - The API key to use.
 * @returns {Promise<{models: Array<{id: string, organization: string, name: string}>, error: string | null}>}
 */
async function kokoroTtsVoices(basePath = null, apiKey = null) {
  let endpoint = basePath || process.env.TTS_KOKORO_ENDPOINT;
  if (!endpoint)
    return { models: [], error: "No Kokoro endpoint was provided." };

  endpoint = new URL(endpoint);
  endpoint.pathname = "/v1/audio/voices";
  const headers = { "Content-Type": "application/json" };
  const key = typeof apiKey === "boolean" ? null : apiKey;
  if (key) headers.Authorization = `Bearer ${key}`;

  const voices = await fetch(endpoint.toString(), { method: "GET", headers })
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText || "Failed to load voices");
      return res.json();
    })
    .then((data) => (Array.isArray(data?.voices) ? data.voices : []))
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(`Kokoro:listVoices`, e.message);
      return null;
    });

  if (!voices || !Array.isArray(voices))
    return { models: [], error: "Could not fetch Kokoro voices." };
  const models = voices.map((voice) => ({
    id: voice.id,
    name: voice.name,
    organization: "Kokoro",
  }));
  return { models, error: null };
}

module.exports = {
  getCustomModels,
  SUPPORT_CUSTOM_MODELS,
};
