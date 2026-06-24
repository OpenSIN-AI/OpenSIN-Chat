// SPDX-License-Identifier: MIT
// Purpose: Validation functions for ENV variable checks in updateENV.
// Docs: server/utils/helpers/updateENV.doc.md

const consoleLogger = require("../../logger/console.js");

function isNotEmpty(input = "") {
  return !input || input.length === 0 ? "Value cannot be empty" : null;
}

function nonZero(input = "") {
  if (isNaN(Number(input))) return "Value must be a number";
  return Number(input) <= 0 ? "Value must be greater than zero" : null;
}

function isInteger(input = "") {
  if (isNaN(Number(input))) return "Value must be a number";
  return Number(input);
}

const ALLOWED_URL_SCHEMES = ["http:", "https:"];

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_URL_SCHEMES.includes(parsed.protocol)) {
      throw new Error(`URL scheme ${parsed.protocol} not allowed`);
    }
    return url;
  } catch (e) {
    throw new Error(`Invalid URL: ${e.message}`, { cause: e });
  }
}

function isValidURL(input = "") {
  try {
    const parsed = new URL(input);
    if (!ALLOWED_URL_SCHEMES.includes(parsed.protocol)) {
      return `URL scheme ${parsed.protocol} is not allowed. Only http: and https: are permitted.`;
    }
    return null;
  } catch {
    return "URL is not a valid URL.";
  }
}

function validOpenAIKey(input = "") {
  return input.startsWith("sk-") ? null : "OpenAI Key must start with sk-";
}

function validAnthropicApiKey(input = "") {
  return input.startsWith("sk-ant-")
    ? null
    : "Anthropic Key must start with sk-ant-";
}

function validLLMExternalBasePath(input = "") {
  try {
    new URL(input);
    if (!input.includes("v1")) return "URL must include /v1";
    if (input.split("").slice(-1)?.[0] === "/")
      return "URL cannot end with a slash";
    return null;
  } catch {
    return "Not a valid URL";
  }
}

function validOllamaLLMBasePath(input = "") {
  try {
    new URL(input);
    if (input.split("").slice(-1)?.[0] === "/")
      return "URL cannot end with a slash";
    return null;
  } catch {
    return "Not a valid URL";
  }
}

function supportedTTSProvider(input = "") {
  const validSelection = [
    "native",
    "openai",
    "elevenlabs",
    "piper_local",
    "generic-openai",
    "kokoro",
    "nvidia-nim",
  ].includes(input);
  return validSelection ? null : `${input} is not a valid TTS provider.`;
}

function supportedSTTProvider(input = "") {
  const validSelection = [
    "native",
    "openai",
    "deepgram",
    "generic-openai",
  ].includes(input);
  return validSelection ? null : `${input} is not a valid STT provider.`;
}

function validLocalWhisper(input = "") {
  const validSelection = [
    "Xenova/whisper-small",
    "Xenova/whisper-large",
  ].includes(input);
  return validSelection
    ? null
    : `${input} is not a valid Whisper model selection.`;
}

function supportedLLM(input = "") {
  const validSelection = [
    "openai",
    "anthropic",
    "gemini",
    "lmstudio",
    "localai",
    "ollama",
    "fireworksai",
    "mistral",
    "huggingface",
    "groq",
    "litellm",
    "generic-openai",
    "xai",
    "opencode-zen",
    "nvidia-nim",
    "docker-model-runner",
    "openafd-router",
  ].includes(input);
  return validSelection ? null : `${input} is not a valid LLM provider.`;
}

function supportedTranscriptionProvider(input = "") {
  const validSelection = ["openai", "local"].includes(input);
  return validSelection
    ? null
    : `${input} is not a valid transcription model provider.`;
}

function validGeminiSafetySetting(input = "") {
  const validModes = [
    "BLOCK_NONE",
    "BLOCK_ONLY_HIGH",
    "BLOCK_MEDIUM_AND_ABOVE",
    "BLOCK_LOW_AND_ABOVE",
  ];
  return validModes.includes(input)
    ? null
    : `Invalid Safety setting. Must be one of ${validModes.join(", ")}.`;
}

function supportedEmbeddingModel(input = "") {
  const supported = [
    "openai",
    "gemini",
    "localai",
    "native",
    "ollama",
    "lmstudio",
    "voyageai",
    "litellm",
    "generic-openai",
    "mistral",
  ];
  return supported.includes(input)
    ? null
    : `Invalid Embedding model type. Must be one of ${supported.join(", ")}.`;
}

function supportedVectorDB(input = "") {
  const supported = [
    "chroma",
    "chromacloud",
    "pinecone",
    "lancedb",
    "weaviate",
    "qdrant",
    "milvus",
    "zilliz",
    "astra",
    "pgvector",
  ];
  return supported.includes(input)
    ? null
    : `Invalid VectorDB type. Must be one of ${supported.join(", ")}.`;
}

function validChromaURL(input = "") {
  return input.slice(-1) === "/"
    ? `Chroma Instance URL should not end in a trailing slash.`
    : null;
}

function requiresForceMode(_, forceModeEnabled = false) {
  return forceModeEnabled === true ? null : "Cannot set this setting.";
}

async function validDockerizedUrl(input = "") {
  if (
    (process.env.OPENSIN_CHAT_RUNTIME || process.env.ANYTHING_LLM_RUNTIME) !==
    "docker"
  )
    return null;

  try {
    const {
      isPortInUse,
      getLocalHosts,
    } = require("../portAvailabilityChecker");
    const localInterfaces = getLocalHosts();
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();
    const port = parseInt(url.port, 10);

    // If not a loopback, skip this check.
    if (!localInterfaces.includes(hostname)) return null;
    if (isNaN(port)) return "Invalid URL: Port is not specified or invalid";

    const isPortInUseFromDocker = await isPortInUse(port, hostname);
    if (!isPortInUseFromDocker)
      return "Port is not running a reachable service on loopback address from inside the OpenSIN Chat container. Please use host.docker.internal (for linux use 172.17.0.1), a real machine ip, or domain to connect to your service.";
  } catch (error) {
    // eslint-disable-next-line no-console
    consoleLogger.error(error.message);
    return "An error occurred while validating the URL";
  }

  return null;
}

function validHuggingFaceEndpoint(input = "") {
  return input.slice(-6) !== ".cloud"
    ? `Your HF Endpoint should end in ".cloud"`
    : null;
}

function noRestrictedChars(input = "") {
  const regExp = new RegExp(/^[a-zA-Z0-9_\-!@$%^&*();]+$/);
  return !regExp.test(input)
    ? `Your password has restricted characters in it. Allowed symbols are _,-,!,@,$,%,^,&,*,(,),;`
    : null;
}

/**
 * Validates the Postgres connection string for the PGVector options.
 * @param {string} input - The Postgres connection string to validate.
 * @returns {string} - An error message if the connection string is invalid, otherwise null.
 */
async function looksLikePostgresConnectionString(connectionString = null) {
  if (!connectionString || !connectionString.startsWith("postgresql://"))
    return "Invalid Postgres connection string. Must start with postgresql://";
  if (connectionString.includes(" "))
    return "Invalid Postgres connection string. Must not contain spaces.";
  return null;
}

module.exports = {
  isNotEmpty,
  nonZero,
  isInteger,
  ALLOWED_URL_SCHEMES,
  validateUrl,
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
};
