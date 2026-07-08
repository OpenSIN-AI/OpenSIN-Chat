// SPDX-License-Identifier: MIT
// Chat flow, event handling, history, and routing methods for AIbitat.
// Split from index.js as part of issue #528 — God-File reduction.
// These methods are mixed into AIbitat.prototype.

const { APIError } = require("./error.js");
const consoleLogger = require("../../logger/console.js");

/**
 * Chat flow and event methods for AIbitat.
 * Mixed into AIbitat.prototype in index.js.
 */
const chatFlowMethods = {
  /**
   * Register a new chat ID for tracking for a given conversation exchange
   * @param {number} chatId - The ID of the chat to register.
   */
  registerChatId(chatId = null) {
    if (!chatId) return;
    this._trackedChatId = Number(chatId);
  },

  /**
   * Get the tracked chat ID for a given conversation exchange
   * @returns {number|null} The ID of the chat to register.
   */
  get trackedChatId() {
    return this._trackedChatId ?? null;
  },

  /**
   * Clear the tracked chat ID for a given conversation exchange
   */
  clearTrackedChatId() {
    this._trackedChatId = null;
  },

  /**
   * Emit the tracked chat ID to the frontend via the websocket
   * plugin (assumed to be attached).
   * @param {string} [uuid] - The message UUID to associate with this chatId
   */
  emitChatId(uuid = null) {
    if (!this.trackedChatId || !uuid) return null;
    this.socket?.send?.("reportStreamEvent", {
      type: "chatId",
      uuid,
      chatId: this.trackedChatId,
    });
  },

  /**
   * Add citation(s) to be reported when the response is finalized.
   * @param {{id: string, title: string, text: string, chunkSource?: string, score?: number}|Array<{id: string, title: string, text: string, chunkSource?: string, score?: number}>} citations - Citation object or array of citation objects
   */
  addCitation(citations) {
    if (!citations) return;
    if (Array.isArray(citations))
      this._pendingCitations.push(...citations.filter(Boolean));
    else if (typeof citations === "object")
      this._pendingCitations.push(citations);
  },

  /**
   * Flush all pending citations to the frontend with the given message UUID.
   * @param {string} messageUuid - The UUID of the message to attach citations to
   */
  flushCitations(messageUuid) {
    if (!messageUuid || this._pendingCitations.length === 0) return;
    this.socket?.send?.("reportStreamEvent", {
      type: "citations",
      uuid: messageUuid,
      citations: this._pendingCitations,
    });
  },

  /**
   * Clear all pending citations. Called after citations have been persisted.
   */
  clearCitations() {
    this._pendingCitations = [];
  },

  /**
   * Send routing metadata to the frontend for the given message UUID.
   * @param {string} messageUuid - The UUID of the message to attach routing info to
   */
  flushRoutingMetadata(messageUuid) {
    const routingMetadata = this.handlerProps?.routingMetadata;
    if (
      !messageUuid ||
      !routingMetadata?.routedTo ||
      !routingMetadata.routedTo.shouldNotify
    )
      return;
    this.socket?.send?.("reportStreamEvent", {
      type: "modelRouteNotification",
      uuid: `${messageUuid}:route`,
      routedTo: routingMetadata.routedTo,
    });
  },

  /**
   * Add an attachment (image) from a tool to be injected into the conversation.
   * @param {{name: string, mime: string, contentString: string}} attachment - The attachment object
   */
  addToolAttachment(attachment) {
    if (!attachment || !attachment.contentString) return;
    this._toolAttachments.push(attachment);
  },

  /**
   * Add a completed clarifying-question survey to the pending buffer.
   * @param {{questions: Array<Object>, result: Object}} survey - The survey to add
   */
  addClarifyingQuestionSurvey(survey) {
    if (!survey || typeof survey !== "object") return;
    this._pendingClarifyingQuestionSurveys.push(survey);
  },

  /**
   * Clear all pending clarifying-question surveys.
   */
  clearClarifyingQuestionSurveys() {
    this._pendingClarifyingQuestionSurveys = [];
  },

  /**
   * Collect and clear any pending tool attachments.
   * @returns {Array<{name: string, mime: string, contentString: string}>} The collected attachments
   */
  collectToolAttachments() {
    if (this._toolAttachments.length === 0) return [];
    const attachments = [...this._toolAttachments];
    this._toolAttachments = [];
    return attachments;
  },

  /**
   * Add a new agent to the AIbitat.
   * @param name
   * @param config
   * @returns
   */
  agent(name = "", config = {}) {
    this.agents.set(name, config);
    return this;
  },

  /**
   * Add a new channel to the AIbitat.
   * @param name
   * @param members
   * @param config
   * @returns
   */
  channel(name = "", members = [""], config = {}) {
    this.channels.set(name, {
      members,
      ...config,
    });
    return this;
  },

  /**
   * Get the specific agent configuration.
   * @param agent The name of the agent.
   * @throws When the agent configuration is not found.
   * @returns The agent configuration.
   */
  getAgentConfig(agent = "") {
    const config = this.agents.get(agent);
    if (!config) {
      throw new Error(`Agent configuration "${agent}" not found`);
    }
    return {
      role: "You are a helpful AI assistant.",
      ...config,
    };
  },

  /**
   * Get the specific channel configuration.
   * @param channel The name of the channel.
   * @throws When the channel configuration is not found.
   * @returns The channel configuration.
   */
  getChannelConfig(channel = "") {
    const config = this.channels.get(channel);
    if (!config) {
      throw new Error(`Channel configuration "${channel}" not found`);
    }
    return {
      maxRounds: 10,
      role: "",
      ...config,
    };
  },

  /**
   * Get the members of a group.
   * @param node The name of the group.
   * @returns The members of the group.
   */
  getGroupMembers(node = "") {
    const group = this.getChannelConfig(node);
    return group.members;
  },

  /**
   * Triggered when a plugin, socket, or command is aborted.
   * @param listener
   * @returns
   */
  onAbort(listener = () => null) {
    this.emitter.on("abort", listener);
    return this;
  },

  /**
   * Abort the running of any plugins that may still be pending.
   */
  abort() {
    this.emitter.emit("abort", null, this);
  },

  /**
   * Triggered when a chat is terminated.
   * @param listener
   * @returns
   */
  onTerminate(listener = () => null) {
    this.emitter.on("terminate", listener);
    return this;
  },

  /**
   * Terminate the chat.
   * @param node Last node to chat with
   */
  terminate(node = "") {
    this.emitter.emit("terminate", node, this);
  },

  /**
   * Triggered when a chat is interrupted by a node.
   * @param listener
   * @returns
   */
  onInterrupt(listener = () => null) {
    this.emitter.on("interrupt", listener);
    return this;
  },

  /**
   * Interruption the chat.
   * @param route The nodes that participated in the interruption.
   * @returns
   */
  interrupt(route) {
    this._chats.push({
      ...route,
      state: "interrupt",
    });
    this.emitter.emit("interrupt", route, this);
  },

  /**
   * Triggered when a message is added to the chat history.
   * @param listener
   * @returns
   */
  onMessage(listener = (_chat) => null) {
    this.emitter.on("message", listener);
    return this;
  },

  /**
   * Register a new successful message in the chat history.
   * @param message
   */
  newMessage(message) {
    const chat = {
      ...message,
      state: "success",
    };

    this._chats.push(chat);
    if (this._chats.length > 200) {
      this._chats.splice(0, this._chats.length - 200);
    }
    this.emitter.emit("message", chat, this);
  },

  /**
   * Triggered when an error occurs during the chat.
   * @param listener
   * @returns
   */
  onError(
    listener = (
      /**
       * The error that occurred.
       *
       * Native errors are:
       * - `APIError`
       * - `AuthorizationError`
       * - `UnknownError`
       * - `RateLimitError`
       * - `ServerError`
       */
      error = null,
      // eslint-disable-next-line
      {},
    ) => null,
  ) {
    this.emitter.on("replyError", listener);
    return this;
  },

  /**
   * Triggered when a tool call completes and returns a result.
   * @param listener
   * @returns
   */
  onToolCallResult(listener = () => null) {
    this.emitter.on("toolCallResult", listener);
    return this;
  },

  /**
   * Register an error in the chat history.
   * @param route
   * @param error
   */
  newError(route, error) {
    const chat = {
      ...route,
      content: error instanceof Error ? error.message : String(error),
      state: "error",
    };
    this._chats.push(chat);
    if (this._chats.length > 200) {
      this._chats.splice(0, this._chats.length - 200);
    }
    this.emitter.emit("replyError", error, chat);
  },

  /**
   * Triggered when a chat is interrupted by a node.
   * @param listener
   * @returns
   */
  onStart(listener = (_chat, _aibitat) => null) {
    this.emitter.on("start", listener);
    return this;
  },

  /**
   * Start a new chat.
   * @param message The message to start the chat.
   */
  async start(message) {
    this.newMessage(message);
    this.emitter.emit("start", message, this);

    await this.chat({
      to: message.from,
      from: message.to,
    });

    return this;
  },

  /**
   * Recursively chat between two nodes.
   * @param route
   * @param keepAlive Whether to keep the chat alive.
   */
  async chat(route, keepAlive = true) {
    if (this.channels.get(route.from)) {
      let nextNode;
      try {
        nextNode = await this.selectNext(route.from);
      } catch (error) {
        if (error instanceof APIError) {
          return this.newError({ from: route.from, to: route.to }, error);
        }
        throw error;
      }

      if (!nextNode) {
        this.terminate(route.from);
        return;
      }

      const nextChat = {
        from: nextNode,
        to: route.from,
      };

      if (this.shouldAgentInterrupt(nextNode)) {
        this.interrupt(nextChat);
        return;
      }

      const history = this.getHistory({ to: route.from });
      const group = this.getGroupMembers(route.from);
      const rounds = history.filter((chat) => group.includes(chat.from)).length;

      const { maxRounds } = this.getChannelConfig(route.from);
      if (rounds >= maxRounds) {
        this.terminate(route.to);
        return;
      }

      await this.chat(nextChat);
      return;
    }

    let reply;
    try {
      reply = await this.reply(route);
    } catch (error) {
      if (error instanceof APIError) {
        return this.newError({ from: route.from, to: route.to }, error);
      }
      throw error;
    }

    if (
      reply === "TERMINATE" ||
      this.hasReachedMaximumRounds(route.from, route.to)
    ) {
      this.terminate(route.to);
      return;
    }

    const newChat = { to: route.from, from: route.to };

    if (
      reply === "INTERRUPT" ||
      (this.agents.get(route.to) && this.shouldAgentInterrupt(route.to))
    ) {
      this.interrupt(newChat);
      return;
    }

    if (keepAlive) {
      await this.chat(newChat, true);
    }
  },

  /**
   * Check if the agent should interrupt the chat based on its configuration.
   * @param agent
   * @returns {boolean} Whether the agent should interrupt the chat.
   */
  shouldAgentInterrupt(agent = "") {
    const config = this.getAgentConfig(agent);
    return this.defaultInterrupt === "ALWAYS" || config.interrupt === "ALWAYS";
  },

  /**
   * Select the next node to chat with from a group.
   * @param channel The name of the group.
   * @returns The name of the node to chat with.
   */
  async selectNext(channel = "") {
    const nodes = this.getGroupMembers(channel);
    const channelConfig = this.getChannelConfig(channel);

    if (nodes.length < 3) {
      consoleLogger.warn(
        `- Group (${channel}) is underpopulated with ${nodes.length} agents. Direct communication would be more efficient.`,
      );
    }

    const availableNodes = nodes.filter(
      (node) => !this.hasReachedMaximumRounds(channel, node),
    );

    const lastChat = this._chats.filter((c) => c.to === channel).at(-1);
    if (lastChat) {
      const index = availableNodes.indexOf(lastChat.from);
      if (index > -1) {
        availableNodes.splice(index, 1);
      }
    }

    if (!availableNodes.length) return;

    const provider = this.getProviderForConfig({
      // @ts-expect-error
      model: "gpt-4",
      ...this.defaultProvider,
      ...channelConfig,
    });
    provider.attachHandlerProps(this.handlerProps);

    const history = this.getHistory({ to: channel });

    const messages = [
      {
        role: "system",
        content: channelConfig.role,
      },
      {
        role: "user",
        content: `You are in a role play game. The following roles are available:
${availableNodes.map((node) => `@${node}: ${this.getAgentConfig(node).role}`).join("\n")}.

Read the following conversation.

CHAT HISTORY
${history.map((c) => `@${c.from}: ${c.content}`).join("\n")}

Then select the next role from that is going to speak next.
Only return the role.
`,
      },
    ];

    const { result } = await provider.complete(messages);
    const name = result?.replace(/^@/g, "");
    if (this.agents.get(name)) return name;

    return availableNodes[Math.floor(Math.random() * availableNodes.length)];
  },

  /**
   * Check if the chat has reached the maximum number of rounds.
   */
  hasReachedMaximumRounds(from = "", to = "") {
    return this.getHistory({ from, to }).length >= this.maxRounds;
  },

  /**
   * Get the chat history between two nodes or all chats to/from a node.
   * @param route
   * @returns
   */
  getOrFormatNodeChatHistory(route) {
    if (this.channels.get(route.to)) {
      return [
        {
          role: "user",
          content: `You are in a whatsapp group. Read the following conversation and then reply.
Do not add introduction or conclusion to your reply because this will be a continuous conversation. Don't introduce yourself.

CHAT HISTORY
${this.getHistory({ to: route.to })
  .map((c) => `@${c.from}: ${c.content}`)
  .join("\n")}

@${route.from}:`,
        },
      ];
    }

    return this.getHistory(route).map((c) => {
      const message = {
        content: c.content,
        role: c.from === route.to ? "user" : "assistant",
      };
      if (
        c.attachments &&
        c.attachments.length > 0 &&
        message.role === "user"
      ) {
        message.attachments = c.attachments;
      }
      return message;
    });
  },

  /**
   * Continue the chat from the last interruption.
   * @param feedback The feedback to the interruption if any.
   * @param attachments Optional attachments (images) to include with the feedback.
   * @returns
   */
  async continue(feedback, attachments = []) {
    const lastChat = this._chats.at(-1);
    if (!lastChat || lastChat.state !== "interrupt") {
      throw new Error("No chat to continue");
    }

    this._chats.pop();

    const { from, to } = lastChat;

    if (this.hasReachedMaximumRounds(from, to)) {
      throw new Error("Maximum rounds reached");
    }

    if (feedback) {
      const message = {
        from,
        to,
        content: feedback,
        ...(attachments?.length > 0 ? { attachments } : {}),
      };

      this.newMessage(message);

      await this.chat({
        to: message.from,
        from: message.to,
      });
    } else {
      await this.chat({ from, to });
    }

    return this;
  },

  /**
   * Retry the last chat that threw an error.
   */
  async retry() {
    const lastChat = this._chats.at(-1);
    if (!lastChat || lastChat.state !== "error") {
      throw new Error("No chat to retry");
    }

    // eslint-disable-next-line
    const { from, to } = this?._chats?.pop();

    await this.chat({ from, to });
    return this;
  },

  /**
   * Get the chat history between two nodes or all chats to/from a node.
   */
  getHistory({ from, to }) {
    return this._chats.filter((chat) => {
      const isSuccess = chat.state === "success";

      if (!from) {
        return isSuccess && chat.to === to;
      }

      if (!to) {
        return isSuccess && chat.from === from;
      }

      const hasSent = chat.from === from && chat.to === to;
      const hasReceived = chat.from === to && chat.to === from;
      const mutual = hasSent || hasReceived;

      return isSuccess && mutual;
    });
  },
};

module.exports = { chatFlowMethods };
