// SPDX-License-Identifier: MIT
const { appendContext } = require("../appendContext");
const consoleLogger = require("../../logger/console.js");

const { logger } = require("../../logger/structured");
const { NativeEmbedder } = require("../../EmbeddingEngines/native");
const {
  LLMPerformanceMonitor,
} = require("../../helpers/chat/LLMPerformanceMonitor");
const {
  formatChatHistory,
  writeResponseChunk,
  clientAbortedHandler,
} = require("../../helpers/chat/responses");
const { parseReasoningFromResponse } = require("../../helpers/reasoningFilter");
const { v4: uuidv4 } = require("uuid");
const { toValidNumber } = require("../../http");
const { getOpenSINChatUserAgent } = require("../../../endpoints/utils");

class GenericOpenAiLLM {
  constructor(embedder = null, modelPreference = null) {
    const { OpenAI: OpenAIApi } = require("openai");
    if (!process.env.GENERIC_OPEN_AI_BASE_PATH)
      throw new Error(
        "GenericOpenAI must have a valid base path to use for the api.",
      );

    this.className = "GenericOpenAiLLM";
    this.basePath = process.env.GENERIC_OPEN_AI_BASE_PATH;
    this.openai = new OpenAIApi({
      baseURL: this.basePath,
      apiKey: process.env.GENERIC_OPEN_AI_API_KEY ?? null,
      timeout: 120000,
      defaultHeaders: {
        "User-Agent": getOpenSINChatUserAgent(),
        ...GenericOpenAiLLM.parseCustomHeaders(),
      },
    });
    this.model =
      modelPreference ?? process.env.GENERIC_OPEN_AI_MODEL_PREF ?? null;
    this.maxTokens = process.env.GENERIC_OPEN_AI_MAX_TOKENS
      ? toValidNumber(process.env.GENERIC_OPEN_AI_MAX_TOKENS, 1024)
      : 1024;
    if (!this.model)
      throw new Error("GenericOpenAI must have a valid model set.");
    this.limits = {
      history: this.promptWindowLimit() * 0.15,
      system: this.promptWindowLimit() * 0.15,
      user: this.promptWindowLimit() * 0.7,
    };

    this.embedder = embedder ?? new NativeEmbedder();
    this.defaultTemp = 0.7;
    this.log(`Inference API: ${this.basePath} Model: ${this.model}`);
  }

  log(text, ...args) {
    const suffix = args.length
      ? ` ${args
          .map((a) => (typeof a === "object" ? JSON.stringify(a) : a))
          .join(" ")}`
      : "";
    logger.info(this.className, `${text}${suffix}`);
  }

  /**
   * Parses custom headers from a CSV-formatted environment variable.
   * Format: "Header-Name:value,Another-Header:value2"
   * @returns {Object} Object with header key-value pairs
   */
  static parseCustomHeaders() {
    const customHeadersEnv = process.env.GENERIC_OPEN_AI_CUSTOM_HEADERS;
    if (!customHeadersEnv) return {};

    const headers = {};
    const pairs = customHeadersEnv.split(",");

    for (const pair of pairs) {
      const colonIndex = pair.indexOf(":"); // only split on first colon for key/value separation
      if (colonIndex === -1) continue;

      const key = pair.substring(0, colonIndex).trim();
      const value = pair.substring(colonIndex + 1).trim();

      if (key && value) headers[key] = value;
    }

    return headers;
  }

  streamingEnabled() {
    if (process.env.GENERIC_OPENAI_STREAMING_DISABLED === "true") return false;
    return "streamGetChatCompletion" in this;
  }

  // Per-model context window limits for Fireworks serverless models.
  // Falls back to GENERIC_OPEN_AI_MODEL_TOKEN_LIMIT env var, then 4096.
  // This prevents sending overlong prompts to models with smaller context windows.
  static #MODEL_CONTEXT_LIMITS = {
    "accounts/fireworks/models/deepseek-v4-pro": 128000,
    "accounts/fireworks/models/deepseek-v4-flash": 128000,
    "accounts/fireworks/models/minimax-m2p5": 1000000,
    "accounts/fireworks/models/minimax-m2p7": 1000000,
    "accounts/fireworks/models/minimax-m3": 1000000,
    "accounts/fireworks/models/glm-5p1": 128000,
    "accounts/fireworks/models/glm-5p2": 128000,
    "accounts/fireworks/models/kimi-k2p7-code": 128000,
    "accounts/fireworks/routers/kimi-k2p7-code-fast": 128000,
    "accounts/fireworks/models/gpt-oss-120b": 128000,
    "accounts/fireworks/models/gpt-oss-20b": 128000,
    "accounts/fireworks/models/qwen3p7-plus": 128000,
  };

  static #contextLimitFor(modelName) {
    if (modelName && GenericOpenAiLLM.#MODEL_CONTEXT_LIMITS[modelName])
      return GenericOpenAiLLM.#MODEL_CONTEXT_LIMITS[modelName];
    const env = Number(process.env.GENERIC_OPEN_AI_MODEL_TOKEN_LIMIT);
    return env > 0 ? env : 4096;
  }

  static promptWindowLimit(_modelName) {
    const limit = GenericOpenAiLLM.#contextLimitFor(_modelName);
    if (!limit || isNaN(Number(limit)))
      throw new Error("No token context limit was set.");
    return Number(limit);
  }

  // Ensure the user set a value for the token limit
  // and if undefined - assume 4096 window.
  promptWindowLimit() {
    const limit = GenericOpenAiLLM.#contextLimitFor(this.model);
    if (!limit || isNaN(Number(limit)))
      throw new Error("No token context limit was set.");
    return Number(limit);
  }

  // Short circuit since we have no idea if the model is valid or not
  // in pre-flight for generic endpoints
  isValidChatCompletionModel(_modelName = "") {
    return true;
  }

  /**
   * Generates appropriate content array for a message + attachments.
   *
   * ## Developer Note
   * This function assumes the generic OpenAI provider is _actually_ OpenAI compatible.
   * For example, Ollama is "OpenAI compatible" but does not support images as a content array.
   * The contentString also is the base64 string WITH `data:image/xxx;base64,` prefix, which may not be the case for all providers.
   * If your provider does not work exactly this way, then attachments will not function or potentially break vision requests.
   * If you encounter this issue, you are welcome to open an issue asking for your specific provider to be supported.
   *
   * This function will **not** be updated for providers that **do not** support images as a content array like OpenAI does.
   * Do not open issues to update this function due to your specific provider not being compatible. Open an issue to request support for your specific provider.
   * @param {Object} props
   * @param {string} props.userPrompt - the user prompt to be sent to the model
   * @param {import("../../helpers").Attachment[]} props.attachments - the array of attachments to be sent to the model
   * @returns {string|object[]}
   */
  #generateContent({ userPrompt, attachments = [] }) {
    if (!attachments.length) {
      return userPrompt;
    }

    if (this.getModelCapabilities().vision === false) {
      return (
        userPrompt +
        "\n\n[Bild wurde hochgeladen aber nicht analysiert — der aktive Provider unterstützt keine Bilderkennung]"
      );
    }

    const content = [{ type: "text", text: userPrompt }];
    for (let attachment of attachments) {
      content.push({
        type: "image_url",
        image_url: {
          url: attachment.contentString,
        },
      });
    }
    return content.flat();
  }

  /**
   * Construct the user prompt for this model.
   * @param {{attachments: import("../../helpers").Attachment[]}} param0
   * @returns
   */
  constructPrompt({
    systemPrompt = "",
    contextTexts = [],
    chatHistory = [],
    userPrompt = "",
    attachments = [],
  }) {
    const prompt = {
      role: "system",
      content: `${systemPrompt}${appendContext(contextTexts)}`,
    };
    return [
      prompt,
      ...formatChatHistory(chatHistory, (args) => this.#generateContent(args)),
      {
        role: "user",
        content: this.#generateContent({ userPrompt, attachments }),
      },
    ];
  }

  /**
   * Extracts accurate generation-only timing and token count from a llama.cpp
   * response or streaming chunk. Mutates the provided usage object in place
   * so it can be used by both streaming and non-streaming code paths.
   * @param {Object} response - the API response or final streaming chunk
   * @param {Object} usage - the usage object to mutate
   */
  #extractLlamaCppTimings(response, usage) {
    if (!response || !response.timings) return;

    if (response.timings.hasOwnProperty("predicted_n"))
      usage.completion_tokens = Number(response.timings.predicted_n);

    if (response.timings.hasOwnProperty("predicted_ms"))
      usage.duration = Number(response.timings.predicted_ms) / 1000;
  }

  /**
   * Includes the usage in the response if the ENV flag is set
   * using the stream_options: { include_usage: true } option. This is available via ENV
   * because some providers will crash with invalid options.
   * @returns {Object}
   */
  #includeStreamOptionsUsage() {
    if (!("GENERIC_OPEN_AI_REPORT_USAGE" in process.env)) return {};
    if (process.env.GENERIC_OPEN_AI_REPORT_USAGE !== "true") return {};
    return {
      stream_options: {
        include_usage: true,
      },
    };
  }

  async getChatCompletion(messages = null, { temperature = 0.7 }) {
    const result = await LLMPerformanceMonitor.measureAsyncFunction(
      this.openai.chat.completions
        .create({
          model: this.model,
          messages,
          temperature,
          max_tokens: this.maxTokens,
        })
        .catch((e) => {
          throw new Error(e.message);
        }),
    );

    if (
      !result.output ||
      !result.output.hasOwnProperty("choices") ||
      result.output.choices.length === 0
    )
      return null;

    const usage = {
      prompt_tokens: result.output?.usage?.prompt_tokens || 0,
      completion_tokens: result.output?.usage?.completion_tokens || 0,
      total_tokens: result.output?.usage?.total_tokens || 0,
      duration: result.duration,
    };
    this.#extractLlamaCppTimings(result.output, usage);

    return {
      textResponse: parseReasoningFromResponse(result.output.choices[0]),
      metrics: {
        ...usage,
        outputTps: usage.completion_tokens / usage.duration,
        model: this.model,
        provider: this.className,
        timestamp: new Date(),
      },
    };
  }

  async streamGetChatCompletion(messages = null, { temperature = 0.7 }) {
    const measuredStreamRequest = await LLMPerformanceMonitor.measureStream({
      func: this.openai.chat.completions.create({
        model: this.model,
        stream: true,
        messages,
        temperature,
        max_tokens: this.maxTokens,
        ...this.#includeStreamOptionsUsage(),
      }),
      messages,
      runPromptTokenCalculation: true,
      modelTag: this.model,
      provider: this.className,
    });
    return measuredStreamRequest;
  }

  handleStream(response, stream, responseProps) {
    const { uuid = uuidv4(), sources = [] } = responseProps;
    let hasUsageMetrics = false;
    let usage = {
      completion_tokens: 0,
    };

    return new Promise(async (resolve) => {
      let fullText = "";
      let reasoningText = "";
      let reasoningMode = true;
      let reasoningBlockOpen = false;

      const handleAbort = () => {
        stream?.endMeasurement(usage);
        clientAbortedHandler(resolve, fullText);
      };
      response.on("close", handleAbort);

      try {
        for await (const chunk of stream) {
          const message = chunk?.choices?.[0];
          const token = message?.delta?.content;
          const reasoningToken = message?.delta?.reasoning_content;

          if (
            chunk.hasOwnProperty("usage") &&
            !!chunk.usage &&
            Object.values(chunk.usage).length > 0
          ) {
            if (chunk.usage.hasOwnProperty("prompt_tokens")) {
              usage.prompt_tokens = Number(chunk.usage.prompt_tokens);
            }

            if (chunk.usage.hasOwnProperty("completion_tokens")) {
              hasUsageMetrics = true;
              usage.completion_tokens = Number(chunk.usage.completion_tokens);
            }
          }

          if (reasoningToken) {
            reasoningText += reasoningToken;
            if (!hasUsageMetrics) usage.completion_tokens++;
            continue;
          }

          if (!!reasoningText && !reasoningToken && token) {
            reasoningText = "";
          }

          if (token) {
            let filteredToken = token;
            if (reasoningMode) {
              if (reasoningBlockOpen) {
                const endIdx = filteredToken.indexOf(" antwortet");
                if (endIdx !== -1) {
                  reasoningBlockOpen = false;
                  filteredToken = filteredToken.slice(endIdx + 8);
                } else {
                  continue;
                }
              }
              const startIdx = filteredToken.indexOf("imdaking");
              if (startIdx !== -1) {
                const afterStart = filteredToken.slice(startIdx + 7);
                const endIdx = afterStart.indexOf(" antwortet");
                if (endIdx !== -1) {
                  filteredToken = afterStart.slice(endIdx + 8);
                } else {
                  reasoningBlockOpen = true;
                  continue;
                }
              }
              if (!filteredToken) continue;
              reasoningMode = false;
            }

            fullText += filteredToken;
            if (!hasUsageMetrics) usage.completion_tokens++;
            writeResponseChunk(response, {
              uuid,
              sources: [],
              type: "textResponseChunk",
              textResponse: filteredToken,
              close: false,
              error: false,
            });
          }

          if (
            message?.hasOwnProperty("finish_reason") &&
            message.finish_reason !== "" &&
            message.finish_reason !== null
          ) {
            writeResponseChunk(response, {
              uuid,
              sources,
              type: "textResponseChunk",
              textResponse: "",
              close: true,
              error: false,
            });
            this.#extractLlamaCppTimings(chunk, usage);

            response.removeListener("close", handleAbort);
            stream?.endMeasurement(usage);
            resolve(fullText);
            break;
          }
        }
      } catch (e) {
        consoleLogger.error(
          `\x1b[43m\x1b[34m[STREAMING ERROR]\x1b[0m ${e.message}`,
        );
        writeResponseChunk(response, {
          uuid,
          type: "abort",
          textResponse: null,
          sources: [],
          close: true,
          error: e.message,
        });
        stream?.endMeasurement(usage);
        resolve(fullText);
      }
    });
  }

  /**
   * Whether this provider supports native OpenAI-compatible tool calling.
   * - This can be any OpenAI compatible provider that supports tool calling
   * - We check the ENV to see if the provider supports tool calling.
   * - If the ENV is not set, we default to false.
   * @returns {boolean}
   */
  #supportsCapabilityFromENV(capability = "") {
    const CapabilityEnvMap = {
      tools: "PROVIDER_SUPPORTS_NATIVE_TOOL_CALLING",
      reasoning: "PROVIDER_SUPPORTS_REASONING",
      imageGeneration: "PROVIDER_SUPPORTS_IMAGE_GENERATION",
      vision: "PROVIDER_SUPPORTS_VISION",
    };

    const envKey = CapabilityEnvMap[capability];
    if (!envKey) return false;

    // If the env var is explicitly set, honour it.
    if (envKey in process.env) {
      return process.env[envKey]?.includes("generic-openai") || false;
    }

    // Fallback: auto-detect vision-capable models by model name when the
    // env var is not set.  This prevents images from being silently
    // stripped for models that genuinely support vision.
    if (capability === "vision") {
      const model = (this.model || "").toLowerCase();
      const VISION_MODEL_PATTERNS = [
        // Fireworks AI models (current pool)
        "minimax-m3",
        "minimax-m2p5",
        "minimax-m2p7",
        "kimi-k2p5",
        "kimi-k2p6",
        "kimi-k2p7",
        "qwen3p6",
        "qwen3p7",
        "qwen-3p6",
        "qwen-3p7",
        "deepseek-v4",
        "glm-5p",
        // OpenAI
        "gpt-4o",
        "gpt-4-vision",
        "gpt-4-turbo",
        // Anthropic
        "claude-3",
        "claude-sonnet",
        "claude-opus",
        "claude-haiku",
        // Google
        "gemini",
        // Meta
        "llama-3.2",
        "llama-4",
        // Other open-source VLMs
        "pixtral",
        "minicpm",
        "internvl",
        "llava",
        "qwen-vl",
        "qwen2-vl",
        "qwen2.5-vl",
        "deepseek-vl",
        "yi-vl",
        "cogvlm",
        "phi-3.5-vision",
        "phi-3-vision",
        "molmo",
        "smolvlm",
      ];
      return VISION_MODEL_PATTERNS.some((p) => model.includes(p));
    }

    return false;
  }

  /**
   * Returns the capabilities of the model.
   * @returns {{tools: 'unknown' | boolean, reasoning: 'unknown' | boolean, imageGeneration: 'unknown' | boolean, vision: 'unknown' | boolean}}
   */
  getModelCapabilities() {
    try {
      return {
        tools: this.#supportsCapabilityFromENV("tools"),
        reasoning: this.#supportsCapabilityFromENV("reasoning"),
        imageGeneration: this.#supportsCapabilityFromENV("imageGeneration"),
        vision: this.#supportsCapabilityFromENV("vision"),
      };
    } catch (error) {
      consoleLogger.error("Error getting model capabilities:", error);
      return {
        tools: "unknown",
        reasoning: "unknown",
        imageGeneration: "unknown",
        vision: "unknown",
      };
    }
  }

  // Simple wrapper for dynamic embedder & normalize interface for all LLM implementations
  async embedTextInput(textInput) {
    return await this.embedder.embedTextInput(textInput);
  }
  async embedChunks(textChunks = []) {
    return await this.embedder.embedChunks(textChunks);
  }

  async compressMessages(promptArgs = {}, rawHistory = []) {
    const { messageArrayCompressor } = require("../../helpers/chat");
    const messageArray = this.constructPrompt(promptArgs);
    return await messageArrayCompressor(this, messageArray, rawHistory);
  }
}

module.exports = {
  GenericOpenAiLLM,
};
