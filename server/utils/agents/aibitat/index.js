// SPDX-License-Identifier: MIT
// AIbitat — core class definition with chat flow and execution methods mixed in.
// Split from the original monolithic index.js as part of issue #528 — God-File reduction.
// Chat flow methods: ./chat-flow.js
// Execution methods: ./execution.js
// Utility functions: ./utils.js

const { EventEmitter } = require("events");
const Providers = require("./providers/index.js");
const { chatFlowMethods } = require("./chat-flow.js");
const { executionMethods } = require("./execution.js");

/**
 * AIbitat is a class that manages the conversation between agents.
 * It is designed to solve a task with LLM.
 *
 * Guiding the chat through a graph of agents.
 */
class AIbitat {
  emitter = new EventEmitter().setMaxListeners(50);

  /**
   * Temporary flag to skip the handleExecution function.
   * @type {boolean}
   */
  skipHandleExecution = false;

  _provider = null;

  /** @type {import("./providers/ai-provider").AgentProviderInstance|null} */
  _providerInstance = null;

  defaultProvider = null;
  defaultInterrupt;
  maxRounds;
  _chats;
  _trackedChatId = null;
  agents = new Map();
  channels = new Map();
  functions = new Map();

  /**
   * Buffer for citations collected during tool execution.
   * @type {Array<{id: string, title: string, text: string, chunkSource?: string, score?: number}>}
   */
  _pendingCitations = [];

  /**
   * Buffer for attachments (images) collected during tool execution.
   * @type {Array<{name: string, mime: string, contentString: string}>}
   */
  _toolAttachments = [];

  /**
   * Buffer for clarifying-question surveys completed during tool execution.
   * @type {Array<{questions: Array<Object>, result: Object}>}
   */
  _pendingClarifyingQuestionSurveys = [];

  /**
   * Get the default maximum number of tools an agent can chain for a single response.
   * @returns {number}
   */
  static defaultMaxToolCalls() {
    const envMaxToolCalls = parseInt(process.env.AGENT_MAX_TOOL_CALLS, 10);
    return !isNaN(envMaxToolCalls) && envMaxToolCalls > 0
      ? envMaxToolCalls
      : 10;
  }

  /**
   * Create a new AIbitat instance.
   * @param {Object} props - The properties for the AIbitat instance.
   */
  constructor(props = {}) {
    const {
      chats = [],
      interrupt = "NEVER",
      maxRounds = 100,
      maxToolCalls = AIbitat.defaultMaxToolCalls(),
      provider = "openai",
      handlerProps = {},
      ...rest
    } = props;
    this._chats = chats;
    this.defaultInterrupt = interrupt;
    this.maxRounds = maxRounds;
    this.maxToolCalls = maxToolCalls;
    this.handlerProps = handlerProps;

    this.defaultProvider = {
      provider,
      ...rest,
    };
    this.provider = this.defaultProvider.provider;
    this.model = this.defaultProvider.model;
  }

  /** Get the chat history between agents and channels. */
  get chats() {
    return this._chats;
  }

  get provider() {
    return this._provider;
  }

  set provider(value) {
    if (value !== null && typeof value !== "string") {
      console.trace();
      throw new TypeError(
        `aibitat.provider must be a string tag (e.g. "openai"), got ${typeof value}. ` +
          `Use aibitat.providerInstance to to get/store the provider instance.`,
      );
    }
    this._provider = value;
  }

  /** @returns {import("./providers/ai-provider").AgentProviderInstance} */
  get providerInstance() {
    return this._providerInstance;
  }

  /** @param {import("./providers/ai-provider").AgentProviderInstance|null} value */
  set providerInstance(value) {
    this._providerInstance = value;
  }

  /**
   * Install a plugin.
   */
  use(plugin) {
    plugin.setup(this);
    return this;
  }

  /**
   * Get provider based on configurations.
   * @param config The provider configuration.
   * @returns {Providers.OpenAIProvider} The provider instance.
   */
  getProviderForConfig(config) {
    if (typeof config.provider === "object") return config.provider;

    switch (config.provider) {
      case "openai":
        return new Providers.OpenAIProvider({ model: config.model });
      case "anthropic":
        return new Providers.AnthropicProvider({ model: config.model });
      case "lmstudio":
        return new Providers.LMStudioProvider({ model: config.model });
      case "ollama":
        return new Providers.OllamaProvider({ model: config.model });
      case "groq":
        return new Providers.GroqProvider({ model: config.model });
      case "localai":
        return new Providers.LocalAIProvider({ model: config.model });
      case "mistral":
        return new Providers.MistralProvider({ model: config.model });
      case "generic-openai":
        return new Providers.GenericOpenAiProvider({ model: config.model });
      case "fireworksai":
        return new Providers.FireworksAIProvider({ model: config.model });
      case "nvidia-nim":
        return new Providers.NvidiaNimProvider({ model: config.model });
      case "litellm":
        return new Providers.LiteLLMProvider({ model: config.model });
      case "xai":
        return new Providers.XAIProvider({ model: config.model });
      case "gemini":
        return new Providers.GeminiProvider({ model: config.model });
      case "docker-model-runner":
        return new Providers.DockerModelRunnerProvider({ model: config.model });
      case "opencode-zen":
        return new Providers.OpencodeZenProvider({ model: config.model });
      default:
        throw new Error(
          `Unknown provider: ${config.provider}. Please use a valid provider.`,
        );
    }
  }

  /**
   * Register a new function to be called by the AIbitat agents.
   * @param functionConfig The function configuration.
   */
  function(functionConfig) {
    this.functions.set(functionConfig.name, functionConfig);
    return this;
  }
}

// Mix in chat flow methods (events, history, routing, chat, continue, retry, etc.)
Object.assign(AIbitat.prototype, chatFlowMethods);

// Mix in execution methods (reply, handleAsyncExecution, handleExecution, etc.)
Object.assign(AIbitat.prototype, executionMethods);

module.exports = AIbitat;
