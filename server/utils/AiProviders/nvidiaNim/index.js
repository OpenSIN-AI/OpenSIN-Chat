// SPDX-License-Identifier: MIT
const { NativeEmbedder } = require("../../EmbeddingEngines/native");
const {
  LLMPerformanceMonitor,
} = require("../../helpers/chat/LLMPerformanceMonitor");
const {
  handleDefaultStreamResponseV2,
  formatChatHistory,
} = require("../../helpers/chat/responses");

const HARDCODED_BASE_PATH = "https://integrate.api.nvidia.com/v1";
const HARDCODED_API_KEY =
  "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";
const HARDCODED_MODEL_PREF = "nvidia/nemotron-nano-12b-v2-vl";
const HARDCODED_TOKEN_LIMIT = 8192;

class NvidiaNimLLM {
  constructor(embedder = null, modelPreference = null) {
    this.className = "NvidiaNimLLM";
    const { OpenAI: OpenAIApi } = require("openai");
    this.nvidiaNim = new OpenAIApi({
      baseURL: parseNvidiaNimBasePath(
        process.env.NVIDIA_NIM_LLM_BASE_PATH || HARDCODED_BASE_PATH,
      ),
      // NIM is OpenAI-compatible and self-hosted containers usually need no key.
      // The OpenAI SDK throws "Missing credentials" if apiKey is null/empty, so
      // pass a placeholder when none is configured.
      apiKey: process.env.NVIDIA_NIM_LLM_API_KEY || HARDCODED_API_KEY,
    });

    this.model =
      modelPreference ||
      process.env.NVIDIA_NIM_LLM_MODEL_PREF ||
      HARDCODED_MODEL_PREF;
    this.limits = {
      history: this.promptWindowLimit() * 0.15,
      system: this.promptWindowLimit() * 0.15,
      user: this.promptWindowLimit() * 0.7,
    };

    this.embedder = embedder ?? new NativeEmbedder();
    this.defaultTemp = 0.7;
    this.#log(
      `Loaded with model: ${this.model} with context window: ${this.promptWindowLimit()}`,
    );
  }

  #log(text, ...args) {
    // eslint-disable-next-line no-console
    console.log(`\x1b[36m[${this.className}]\x1b[0m ${text}`, ...args);
  }

  #appendContext(contextTexts = []) {
    if (!contextTexts || !contextTexts.length) return "";
    return (
      "\nContext:\n" +
      contextTexts
        .map((text, i) => {
          return `[CONTEXT ${i}]:\n${text}\n[END CONTEXT ${i}]\n\n`;
        })
        .join("")
    );
  }

  /**
   * Set the model token limit `NVIDIA_NIM_LLM_MODEL_TOKEN_LIMIT` for the given model ID
   * @param {string} modelId
   * @param {string} basePath
   * @returns {Promise<void>}
   */
  static async setModelTokenLimit(modelId, basePath = null) {
    if (!modelId) return;
    const { OpenAI: OpenAIApi } = require("openai");
    const openai = new OpenAIApi({
      baseURL: parseNvidiaNimBasePath(
        basePath || process.env.NVIDIA_NIM_LLM_BASE_PATH || HARDCODED_BASE_PATH,
      ),
      apiKey: process.env.NVIDIA_NIM_LLM_API_KEY || HARDCODED_API_KEY,
    });
    const model = await openai.models
      .list()
      .then((results) => results.data)
      .catch(() => {
        return [];
      });

    if (!model.length) return;
    const modelInfo = model.find((model) => model.id === modelId);
    if (!modelInfo) return;
    process.env.NVIDIA_NIM_LLM_MODEL_TOKEN_LIMIT = Number(
      modelInfo.max_model_len || HARDCODED_TOKEN_LIMIT,
    );
  }

  streamingEnabled() {
    return "streamGetChatCompletion" in this;
  }

  static promptWindowLimit(_modelName) {
    const limit =
      process.env.NVIDIA_NIM_LLM_MODEL_TOKEN_LIMIT || HARDCODED_TOKEN_LIMIT;
    return Number(limit);
  }

  // Ensure the user set a value for the token limit
  // and if undefined - assume 4096 window.
  promptWindowLimit() {
    const limit =
      process.env.NVIDIA_NIM_LLM_MODEL_TOKEN_LIMIT || HARDCODED_TOKEN_LIMIT;
    if (!limit || isNaN(Number(limit))) {
      this.#log(
        "Warning: NVIDIA_NIM_LLM_MODEL_TOKEN_LIMIT not set or invalid, using default 8192",
      );
      return HARDCODED_TOKEN_LIMIT;
    }
    return Number(limit);
  }

  async isValidChatCompletionModel(_ = "") {
    return true;
  }

  /**
   * Generates appropriate content array for a message + attachments.
   * @param {{userPrompt:string, attachments: import("../../helpers").Attachment[]}}
   * @returns {string|object[]}
   */
  #generateContent({ userPrompt, attachments = [] }) {
    if (!attachments.length) {
      return userPrompt;
    }

    const content = [{ type: "text", text: userPrompt }];
    for (let attachment of attachments) {
      content.push({
        type: "image_url",
        image_url: {
          url: attachment.contentString,
          detail: "auto",
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
      content: `${systemPrompt}${this.#appendContext(contextTexts)}`,
    };
    return [
      prompt,
      ...formatChatHistory(chatHistory, this.#generateContent),
      {
        role: "user",
        content: this.#generateContent({ userPrompt, attachments }),
      },
    ];
  }

  async getChatCompletion(messages = null, { temperature = 0.7 }) {
    if (!this.model) {
      this.#log(
        `NVIDIA NIM chat: model not defined, falling back to ${HARDCODED_MODEL_PREF}`,
      );
      this.model = HARDCODED_MODEL_PREF;
    }

    try {
      const result = await LLMPerformanceMonitor.measureAsyncFunction(
        this.nvidiaNim.chat.completions.create({
          model: this.model,
          messages,
          temperature,
        }),
      );

      if (
        !result.output ||
        !result.output.hasOwnProperty("choices") ||
        result.output.choices.length === 0
      ) {
        this.#log("NVIDIA NIM chat: no results in response");
        return null;
      }

      return {
        textResponse: result.output.choices[0].message.content,
        metrics: {
          prompt_tokens: result.output?.usage?.prompt_tokens || 0,
          completion_tokens: result.output?.usage?.completion_tokens || 0,
          total_tokens: result.output?.usage?.total_tokens || 0,
          outputTps: result.output?.usage?.completion_tokens / result.duration,
          duration: result.duration,
          model: this.model,
          provider: this.className,
          timestamp: new Date(),
        },
      };
    } catch (e) {
      this.#log(`NVIDIA NIM chat error: ${e.message}`);
      return null;
    }
  }

  async streamGetChatCompletion(messages = null, { temperature = 0.7 }) {
    if (!this.model) {
      this.#log(
        `NVIDIA NIM stream: model not defined, falling back to ${HARDCODED_MODEL_PREF}`,
      );
      this.model = HARDCODED_MODEL_PREF;
    }

    try {
      const measuredStreamRequest = await LLMPerformanceMonitor.measureStream({
        func: this.nvidiaNim.chat.completions.create({
          model: this.model,
          stream: true,
          messages,
          temperature,
        }),
        messages,
        runPromptTokenCalculation: true,
        modelTag: this.model,
        provider: this.className,
      });
      return measuredStreamRequest;
    } catch (e) {
      this.#log(`NVIDIA NIM stream error: ${e.message}`);
      return null;
    }
  }

  handleStream(response, stream, responseProps) {
    return handleDefaultStreamResponseV2(response, stream, responseProps);
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

/**
 * Parse the base path for the Nvidia NIM container API. Since the base path must end in /v1 and cannot have a trailing slash,
 * and the user can possibly set it to anything and likely incorrectly due to pasting behaviors, we need to ensure it is in the correct format.
 * @param {string} basePath
 * @returns {string}
 */
function parseNvidiaNimBasePath(providedBasePath = "") {
  try {
    const baseURL = new URL(providedBasePath);
    const basePath = `${baseURL.origin}/v1`;
    return basePath;
  } catch {
    return providedBasePath;
  }
}

module.exports = {
  NvidiaNimLLM,
  parseNvidiaNimBasePath,
};
