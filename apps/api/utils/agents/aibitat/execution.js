// SPDX-License-Identifier: MIT
// Provider execution methods (streaming/non-streaming) and reply logic for AIbitat.
// Split from index.js as part of issue #528 — God-File reduction.
// These methods are mixed into AIbitat.prototype.

const { APIError } = require("./error.js");
const { Telemetry } = require("../../../models/telemetry.js");
const { v4 } = require("uuid");
const { ToolReranker } = require("./utils/toolReranker.js");
const Ajv = require("ajv");
const consoleLogger = require("../../logger/console.js");
const { sanitizeToolResultForLLM } = require("./utils.js");

const _ajv = new Ajv({ allErrors: true, strict: false });

/**
 * Execution and reply methods for AIbitat.
 * Mixed into AIbitat.prototype in index.js.
 */
const executionMethods = {
  /**
   * Parse a function name, handling child plugins (#) and custom plugins (@@).
   * @param {string} pluginName
   * @returns {string}
   */
  _parseFunctionName(pluginName = "") {
    if (!pluginName.includes("#") && !pluginName.startsWith("@@"))
      return pluginName;
    if (pluginName.startsWith("@@")) return pluginName.replace("@@", "");
    return pluginName.split("#")[1];
  },

  /**
   * Extract the user's prompt from the messages array for tool reranking.
   * @param {Array} messages - Array of chat messages
   * @returns {string|null} The user's prompt or null if not found
   */
  _extractUserPrompt(messages) {
    if (!messages || !Array.isArray(messages)) return null;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "user" && msg.content) {
        return typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);
      }
    }
    return null;
  },

  /**
   * Ask the AI provider to generate a reply to the chat.
   * @param route.to The node that sent the chat.
   * @param route.from The node that will reply to the chat.
   */
  async reply(route) {
    const fromConfig = this.getAgentConfig(route.from);
    const chatHistory = this.getOrFormatNodeChatHistory(route);

    // Fetch fresh parsed file context and inject into the last user message
    if (this.fetchParsedFileContext) {
      try {
        const parsedContext = await this.fetchParsedFileContext();
        if (parsedContext) {
          for (let i = chatHistory.length - 1; i >= 0; i--) {
            if (chatHistory[i].role === "user") {
              chatHistory[i] = {
                ...chatHistory[i],
                content: chatHistory[i].content + parsedContext,
              };
              break;
            }
          }
        }
      } catch (e) {
        this.handlerProps?.log?.(
          `[warning]: Failed to fetch parsed file context: ${e.message}`,
        );
      }
    }

    const messages = [
      {
        content: fromConfig.role,
        role: "system",
      },
      ...chatHistory,
    ];

    let functions = fromConfig.functions
      ?.map((name) => this.functions.get(this._parseFunctionName(name)))
      .filter((a) => !!a);

    // Rerank tools based on user prompt if enabled
    if (ToolReranker.isEnabled() && functions?.length) {
      const toolReranker = new ToolReranker();
      const userPrompt = this._extractUserPrompt(messages);
      if (userPrompt)
        functions = await toolReranker.rerank(userPrompt, functions);
    } else {
      if (functions?.length > ToolReranker.defaultTopN) {
        this.handlerProps.log?.(
          `

\x1b[44m[HINT]\x1b[0m: You are injecting \x1b[0;93m${functions.length} tools\x1b[0m into every request.
Consider enabling \x1b[0;93mIntelligent Skill Selection\x1b[0m to reduce token usage from tool call bloat by up to \x1b[0;93m80% per request\x1b[0m.
/docs

`,
        );
      }
    }

    // Re-evaluate model router before each turn if a resolver is attached.
    if (this.resolveRoute) {
      try {
        const userPrompt =
          this._extractUserPrompt(messages) || route.content || "";
        const resolved = await this.resolveRoute(userPrompt);
        if (resolved) {
          this.defaultProvider = {
            ...this.defaultProvider,
            provider: resolved.provider,
            model: resolved.model,
          };
        }
      } catch (e) {
        this.handlerProps?.log?.(
          `[warning]: Failed to resolve route: ${e.message}`,
        );
      }
    }

    this.providerInstance = this.getProviderForConfig({
      ...this.defaultProvider,
      ...fromConfig,
    });
    this.providerInstance.attachHandlerProps(this.handlerProps);

    let content;
    if (this.providerInstance.supportsAgentStreaming) {
      this.handlerProps.log?.(
        "[DEBUG] Provider supports agent streaming - will use async execution!",
      );
      content = await this.handleAsyncExecution(
        messages,
        functions,
        route.from,
      );
    } else {
      this.handlerProps.log?.(
        "[DEBUG] Provider does not support agent streaming - will use synchronous execution!",
      );
      content = await this.handleExecution(messages, functions, route.from);
    }

    this.newMessage({ ...route, content });
    return content;
  },

  /**
   * Wrapper for provider calls that catches errors and converts them to APIError.
   * @param {Function} providerCall - Async function that calls the provider
   * @returns {Promise<any>} - The result of the provider call
   * @throws {APIError} - If the provider call fails
   */
  async _safeProviderCall(providerCall) {
    try {
      return await providerCall();
    } catch (error) {
      consoleLogger.error(`[AIbitat] Provider error: ${error.message}`, {
        hide_meta: true,
      });
      throw new APIError(`The agent model failed to respond: ${error.message}`);
    }
  },

  /**
   * Record provider usage to per-invocation cost accumulator.
   */
  _recordInvocationUsage() {
    this._invocationCostUsd ??= 0;
    try {
      const usage = this.providerInstance?.getUsage?.() || {};
      const tokens = usage.total_tokens || 0;
      const pricePer1k = parseFloat(process.env.AGENT_TOKEN_PRICE_USD_PER_1K);
      const rate = !isNaN(pricePer1k) && pricePer1k > 0 ? pricePer1k : 0.01;
      this._invocationCostUsd += (tokens / 1000) * rate;
    } catch (e) {
      this.handlerProps?.log?.(
        `[warning]: Failed to record invocation usage: ${e.message}`,
      );
    }
  },

  /**
   * Handle the async (streaming) execution of the provider
   * with tool calls. Reads the provider from this.providerInstance.
   * @param messages
   * @param functions
   * @param byAgent
   * @returns {Promise<string>}
   */
  async handleAsyncExecution(
    messages = [],
    functions = [],
    byAgent = null,
    depth = 0,
  ) {
    const eventHandler = (type, data) => {
      this?.socket?.send(type, data);
    };

    if (depth === 0) {
      const timeoutMs = parseInt(process.env.AGENT_TIMEOUT_MS, 10);
      this._invocationDeadline =
        Date.now() + (!isNaN(timeoutMs) && timeoutMs > 0 ? timeoutMs : 300000);
      const costCap = parseFloat(process.env.AGENT_MAX_COST_USD);
      this._invocationCostCapUsd =
        !isNaN(costCap) && costCap > 0 ? costCap : 5.0;
      this._invocationCostUsd = 0;
    }

    const checkInvocationBudget = () => {
      if (this._invocationDeadline && Date.now() > this._invocationDeadline) {
        this.handlerProps?.log?.(
          "[error]: Agent wall-clock deadline exceeded; aborting.",
        );
        this.abort();
        throw new Error("Agent wall-clock deadline exceeded");
      }
      if (
        this._invocationCostCapUsd &&
        this._invocationCostUsd > this._invocationCostCapUsd
      ) {
        this.handlerProps?.log?.(
          `[error]: Agent invocation exceeded cost cap ($${this._invocationCostCapUsd.toFixed(2)}); aborting.`,
        );
        this.abort();
        throw new Error("Agent invocation cost cap exceeded");
      }
    };

    const absoluteMaxDepth = this.maxToolCalls + 5;
    if (depth >= absoluteMaxDepth) {
      this.handlerProps?.log?.(
        `[warning]: Absolute depth limit (${absoluteMaxDepth}) reached. Forcing text response.`,
      );
      this?.introspect?.(
        `Maximum execution depth reached. Generating final response without further tool calls.`,
      );
      const fallbackStream = await this._safeProviderCall(() =>
        this.providerInstance.stream(messages, [], eventHandler),
      );
      const fallbackUuid = fallbackStream?.uuid || v4();
      eventHandler?.("reportStreamEvent", {
        type: "usageMetrics",
        uuid: fallbackUuid,
        metrics: this.providerInstance.getUsage(),
      });
      this?.flushCitations?.(fallbackUuid);
      this?.emitChatId?.(fallbackUuid);
      return fallbackStream?.textResponse || "";
    }

    if (depth === 0) this?.flushRoutingMetadata?.(v4());

    checkInvocationBudget();

    /** @type {{ functionCall: { name: string, arguments: string }, textResponse: string }} */
    const completionStream = await this._safeProviderCall(() =>
      this.providerInstance.stream(messages, functions, eventHandler),
    );
    this._recordInvocationUsage();

    if (completionStream.functionCall) {
      const { name, arguments: args } = completionStream.functionCall;
      const fn = this.functions.get(name);
      const reachedToolLimit = depth >= this.maxToolCalls;

      if (reachedToolLimit) {
        this.handlerProps?.log?.(
          `[warning]: Maximum tool call limit (${this.maxToolCalls}) reached. Executing final tool call then generating response.`,
        );
        this?.introspect?.(
          `Maximum tool call limit (${this.maxToolCalls}) reached. After this tool I will generate a final response.`,
        );
      }

      if (!fn) {
        return await this.handleAsyncExecution(
          [
            ...messages,
            {
              name,
              role: "function",
              content: `Function "${name}" not found. Try again.`,
              originalFunctionCall: completionStream.functionCall,
            },
          ],
          reachedToolLimit ? [] : functions,
          byAgent,
          depth + 1,
        );
      }

      fn.caller = byAgent || "agent";

      if (this.providerInstance?.verbose) {
        this?.introspect?.(
          `${fn.caller} is executing \`${name}\` tool ${JSON.stringify(args, null, 2)}`,
        );
      }

      this.handlerProps?.log?.(
        `[debug]: ${fn.caller} is attempting to call \`${name}\` tool ${JSON.stringify(args, null, 2)}`,
      );

      if (fn.parameters) {
        try {
          const validate = _ajv.compile(fn.parameters);
          if (!validate(args)) {
            const errs = JSON.stringify(validate.errors);
            this.handlerProps?.log?.(
              `[error]: ${name} rejected — args do not match schema: ${errs}`,
            );
            return await this.handleAsyncExecution(
              [
                ...messages,
                {
                  name,
                  role: "function",
                  content: `<tool_output>Invalid arguments for "${name}": ${errs}</tool_output>`,
                  originalFunctionCall: completionStream.functionCall,
                },
              ],
              reachedToolLimit ? [] : functions,
              byAgent,
              depth + 1,
            );
          }
        } catch (e) {
          this.handlerProps?.log?.(
            `[warning]: ${name} schema compile failed; skipping validation: ${e.message}`,
          );
        }
      } else {
        this.handlerProps?.log?.(
          `[warning]: ${name} has no parameters schema; skipping runtime validation.`,
        );
      }

      const result = await fn.handler(args);
      Telemetry.sendTelemetry(
        "agent_tool_call",
        { tool: name },
        null,
        true,
      ).catch((err) => {
        consoleLogger.error("Telemetry error:", err.message);
      });
      this.emitter.emit("toolCallResult", {
        toolName: name,
        arguments: args,
        result,
      });

      if (this.skipHandleExecution) {
        this.skipHandleExecution = false;
        this?.introspect?.(
          `The tool call has direct output enabled! The result will be returned directly to the chat without any further processing and no further tool calls will be run.`,
        );
        this?.introspect?.(`Tool use completed.`);
        this.handlerProps?.log?.(
          `${fn.caller} tool call resulted in direct output! Returning raw result as string. NO MORE TOOL CALLS WILL BE EXECUTED.`,
        );
        const directOutputUUID = completionStream?.uuid || v4();
        eventHandler?.("reportStreamEvent", {
          type: "fullTextResponse",
          uuid: directOutputUUID,
          content: result,
        });
        eventHandler?.("reportStreamEvent", {
          type: "usageMetrics",
          uuid: directOutputUUID,
          metrics: this.providerInstance.getUsage(),
        });
        this?.flushCitations?.(directOutputUUID);
        this?.emitChatId?.(directOutputUUID);
        return result;
      }

      const toolAttachments = this.collectToolAttachments();
      const wrappedResult = sanitizeToolResultForLLM(result);
      const newMessages = [
        ...messages,
        {
          name,
          role: "function",
          content: wrappedResult,
          originalFunctionCall: completionStream.functionCall,
        },
      ];

      if (toolAttachments.length > 0) {
        this.handlerProps?.log?.(
          `[debug]: Injecting ${toolAttachments.length} image attachment(s) from tool result`,
        );
        newMessages.push({
          role: "user",
          content: "[Attached image(s) from tool result]",
          attachments: toolAttachments,
        });
      }

      return await this.handleAsyncExecution(
        newMessages,
        reachedToolLimit ? [] : functions,
        byAgent,
        depth + 1,
      );
    }

    const responseUuid = completionStream?.uuid || v4();
    eventHandler?.("reportStreamEvent", {
      type: "usageMetrics",
      uuid: responseUuid,
      metrics: this.providerInstance.getUsage(),
    });
    this?.flushCitations?.(responseUuid);
    this?.emitChatId?.(responseUuid);
    return completionStream?.textResponse;
  },

  /**
   * Handle the synchronous (non-streaming) execution of the provider
   * with tool calls. Reads the provider from this.providerInstance.
   * @param messages
   * @param functions
   * @param byAgent
   * @param depth
   * @param msgUUID - The message UUID to use for event correlation
   * @returns {Promise<string>}
   */
  async handleExecution(
    messages = [],
    functions = [],
    byAgent = null,
    depth = 0,
    msgUUID = null,
  ) {
    if (!msgUUID) msgUUID = v4();
    const eventHandler = (type, data) => {
      this?.socket?.send(type, data);
    };

    if (depth === 0) {
      const timeoutMs = parseInt(process.env.AGENT_TIMEOUT_MS, 10);
      this._invocationDeadline =
        Date.now() + (!isNaN(timeoutMs) && timeoutMs > 0 ? timeoutMs : 300000);
      const costCap = parseFloat(process.env.AGENT_MAX_COST_USD);
      this._invocationCostCapUsd =
        !isNaN(costCap) && costCap > 0 ? costCap : 5.0;
      this._invocationCostUsd = 0;
    }

    const checkInvocationBudget = () => {
      if (this._invocationDeadline && Date.now() > this._invocationDeadline) {
        this.handlerProps?.log?.(
          "[error]: Agent wall-clock deadline exceeded; aborting.",
        );
        this.abort();
        throw new Error("Agent wall-clock deadline exceeded");
      }
      if (
        this._invocationCostCapUsd &&
        this._invocationCostUsd > this._invocationCostCapUsd
      ) {
        this.handlerProps?.log?.(
          `[error]: Agent invocation exceeded cost cap ($${this._invocationCostCapUsd.toFixed(2)}); aborting.`,
        );
        this.abort();
        throw new Error("Agent invocation cost cap exceeded");
      }
    };

    const absoluteMaxDepth = this.maxToolCalls + 5;
    if (depth >= absoluteMaxDepth) {
      this.handlerProps?.log?.(
        `[warning]: Absolute depth limit (${absoluteMaxDepth}) reached. Forcing text response.`,
      );
      this?.introspect?.(
        `Maximum execution depth reached. Generating final response without further tool calls.`,
      );
      const fallbackCompletion = await this._safeProviderCall(() =>
        this.providerInstance.complete(messages, []),
      );
      eventHandler?.("reportStreamEvent", {
        type: "usageMetrics",
        uuid: msgUUID,
        metrics: this.providerInstance.getUsage(),
      });
      this?.flushCitations?.(msgUUID);
      this?.emitChatId?.(msgUUID);
      return fallbackCompletion?.textResponse || "";
    }

    if (depth === 0) this?.flushRoutingMetadata?.(msgUUID);

    checkInvocationBudget();

    const completion = await this._safeProviderCall(() =>
      this.providerInstance.complete(messages, functions),
    );
    this._recordInvocationUsage();

    if (completion.functionCall) {
      const { name, arguments: args } = completion.functionCall;
      const fn = this.functions.get(name);
      const reachedToolLimit = depth >= this.maxToolCalls;

      if (reachedToolLimit) {
        this.handlerProps?.log?.(
          `[warning]: Maximum tool call limit (${this.maxToolCalls}) reached. Executing final tool call then generating response.`,
        );
        this?.introspect?.(
          `Maximum tool call limit (${this.maxToolCalls}) reached. After this tool I will generate a final response.`,
        );
      }

      if (!fn) {
        return await this.handleExecution(
          [
            ...messages,
            {
              name,
              role: "function",
              content: `Function "${name}" not found. Try again.`,
              originalFunctionCall: completion.functionCall,
            },
          ],
          reachedToolLimit ? [] : functions,
          byAgent,
          depth + 1,
          msgUUID,
        );
      }

      fn.caller = byAgent || "agent";

      if (this.providerInstance?.verbose) {
        this?.introspect?.(
          `[debug]: ${fn.caller} is attempting to call \`${name}\` tool`,
        );
      }

      this.handlerProps?.log?.(
        `[debug]: ${fn.caller} is attempting to call \`${name}\` tool`,
      );

      if (fn.parameters) {
        try {
          const validate = _ajv.compile(fn.parameters);
          if (!validate(args)) {
            const errs = JSON.stringify(validate.errors);
            this.handlerProps?.log?.(
              `[error]: ${name} rejected — args do not match schema: ${errs}`,
            );
            return await this.handleExecution(
              [
                ...messages,
                {
                  name,
                  role: "function",
                  content: `<tool_output>Invalid arguments for "${name}": ${errs}</tool_output>`,
                  originalFunctionCall: completion.functionCall,
                },
              ],
              reachedToolLimit ? [] : functions,
              byAgent,
              depth + 1,
              msgUUID,
            );
          }
        } catch (e) {
          this.handlerProps?.log?.(
            `[warning]: ${name} schema compile failed; skipping validation: ${e.message}`,
          );
        }
      } else {
        this.handlerProps?.log?.(
          `[warning]: ${name} has no parameters schema; skipping runtime validation.`,
        );
      }

      const result = await fn.handler(args);
      Telemetry.sendTelemetry(
        "agent_tool_call",
        { tool: name },
        null,
        true,
      ).catch((err) => {
        consoleLogger.error("Telemetry error:", err.message);
      });
      this.emitter.emit("toolCallResult", {
        toolName: name,
        arguments: args,
        result,
      });

      if (this.skipHandleExecution) {
        this.skipHandleExecution = false;
        this?.introspect?.(
          `The tool call has direct output enabled! The result will be returned directly to the chat without any further processing and no further tool calls will be run.`,
        );
        this?.introspect?.(`Tool use completed.`);
        this.handlerProps?.log?.(
          `${fn.caller} tool call resulted in direct output! Returning raw result as string. NO MORE TOOL CALLS WILL BE EXECUTED.`,
        );
        eventHandler?.("reportStreamEvent", {
          type: "usageMetrics",
          uuid: msgUUID,
          metrics: this.providerInstance.getUsage(),
        });
        this?.flushCitations?.(msgUUID);
        return result;
      }

      const toolAttachments = this.collectToolAttachments();
      const wrappedResult = sanitizeToolResultForLLM(result);
      const newMessages = [
        ...messages,
        {
          name,
          role: "function",
          content: wrappedResult,
          originalFunctionCall: completion.functionCall,
        },
      ];

      if (toolAttachments.length > 0) {
        this.handlerProps?.log?.(
          `[debug]: Injecting ${toolAttachments.length} image attachment(s) from tool result`,
        );
        newMessages.push({
          role: "user",
          content: "[Attached image(s) from tool result]",
          attachments: toolAttachments,
        });
      }

      return await this.handleExecution(
        newMessages,
        reachedToolLimit ? [] : functions,
        byAgent,
        depth + 1,
        msgUUID,
      );
    }

    eventHandler?.("reportStreamEvent", {
      type: "usageMetrics",
      uuid: msgUUID,
      metrics: this.providerInstance.getUsage(),
    });
    this?.flushCitations?.(msgUUID);
    this?.emitChatId?.(msgUUID);
    return completion?.textResponse;
  },
};

module.exports = { executionMethods };
