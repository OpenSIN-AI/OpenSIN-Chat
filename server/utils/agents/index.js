// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const AIbitat = require("./aibitat");
const AgentPlugins = require("./aibitat/plugins");
const {
  WorkspaceAgentInvocation,
} = require("../../models/workspaceAgentInvocation");
const { WorkspaceParsedFiles } = require("../../models/workspaceParsedFiles");
const { User } = require("../../models/user");
const { Workspace } = require("../../models/workspace");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { safeJsonParse } = require("../http");
const { USER_AGENT, WORKSPACE_AGENT } = require("./defaults");
const ImportedPlugin = require("./imported");
const { AgentFlows } = require("../agentFlows");
const MCPCompatibilityLayer = require("../MCP");
const {
  getAndClearInvocationAttachments,
  getAndClearInvocationUrlPrompt,
} = require("../chats/agents");
const { DocumentManager } = require("../DocumentManager");

class AgentHandler {
  #invocationUUID;
  #funcsToLoad = [];
  #urlPrompt = null;
  invocation = null;
  aibitat = null;
  channel = null;
  provider = null;
  model = null;
  attachments = [];

  constructor({ uuid }) {
    this.#invocationUUID = uuid;
  }

  log(text, ...args) {
    consoleLogger.log(`\x1b[36m[AgentHandler]\x1b[0m ${text}`, ...args);
  }

  closeAlert() {
    this.log(`End ${this.#invocationUUID}::${this.provider}:${this.model}`);
  }

  /**
   * Determine if the message should invoke the agent handler.
   * This is true when the user explicitly invokes an agent (via @agent prefix)
   * or when the workspace is in automatic mode **and** the provider supports native tool calling.
   * @param {object} parameters
   * @param {string} parameters.message - The message to check for agent invocation.
   * @param { import("@prisma/client").workspaces} parameters.workspace - The workspace to check for agent invocation.
   * @param {string} parameters.chatMode - The chat mode to check for agent invocation.
   * @returns {Promise<boolean>}
   */
  static async isAgentInvocation({
    message,
    workspace = null,
    chatMode = null,
  }) {
    if (this.#isAgentCommandInvocation({ message })) return true;
    if (chatMode === "automatic") {
      if (!workspace) return false;
      if (await Workspace.supportsNativeToolCalling(workspace)) return true;
      return false;
    }
    return false;
  }

  /**
   * Determine if the message provided is an agent invocation.
   * @param {{message:string}} parameters
   * @returns {boolean}
   */
  static #isAgentCommandInvocation({ message }) {
    const agentHandles = WorkspaceAgentInvocation.parseAgents(message);
    if (agentHandles.length > 0) return true;
    return false;
  }

  async #chatHistory(limit = 10) {
    try {
      const rawHistory = (
        await WorkspaceChats.where(
          {
            workspaceId: this.invocation.workspace_id,
            user_id: this.invocation.user_id || null,
            thread_id: this.invocation.thread_id || null,
            api_session_id: null,
            include: true,
          },
          limit,
          { id: "desc" },
        )
      ).reverse();

      const agentHistory = [];
      rawHistory.forEach((chatLog) => {
        agentHistory.push(
          {
            from: USER_AGENT.name,
            to: WORKSPACE_AGENT.name,
            content: chatLog.prompt,
            state: "success",
          },
          {
            from: WORKSPACE_AGENT.name,
            to: USER_AGENT.name,
            content: safeJsonParse(chatLog.response)?.text || "",
            state: "success",
          },
        );
      });
      return agentHistory;
    } catch (e) {
      this.log("Error loading chat history", e.message);
      return [];
    }
  }

  checkSetup() {
    switch (this.provider) {
      case "openai":
        if (!process.env.OPEN_AI_KEY)
          throw new Error("OpenAI API key must be provided to use agents.");
        break;
      case "anthropic":
        if (!process.env.ANTHROPIC_API_KEY)
          throw new Error("Anthropic API key must be provided to use agents.");
        break;
      case "lmstudio":
        if (!process.env.LMSTUDIO_BASE_PATH)
          throw new Error("LMStudio base path must be provided to use agents.");
        break;
      case "ollama":
        if (!process.env.OLLAMA_BASE_PATH)
          throw new Error("Ollama base path must be provided to use agents.");
        break;
      case "groq":
        if (!process.env.GROQ_API_KEY)
          throw new Error("Groq API key must be provided to use agents.");
        break;
      case "localai":
        if (!process.env.LOCAL_AI_BASE_PATH)
          throw new Error(
            "LocalAI must have a valid base path to use for the api.",
          );
        break;
      case "mistral":
        if (!process.env.MISTRAL_API_KEY)
          throw new Error("Mistral API key must be provided to use agents.");
        break;
      case "generic-openai":
        if (!process.env.GENERIC_OPEN_AI_BASE_PATH)
          throw new Error("API base path must be provided to use agents.");
        break;
      case "fireworksai":
        if (!process.env.FIREWORKS_AI_LLM_API_KEY)
          throw new Error(
            "FireworksAI API Key must be provided to use agents.",
          );
        break;
      case "litellm":
        if (!process.env.LITE_LLM_BASE_PATH)
          throw new Error(
            "LiteLLM API base path and key must be provided to use agents.",
          );
        break;
      case "xai":
        if (!process.env.XAI_LLM_API_KEY)
          throw new Error("xAI API Key must be provided to use agents.");
        break;
      case "nvidia-nim":
        if (!process.env.NVIDIA_NIM_LLM_BASE_PATH)
          throw new Error(
            "NVIDIA NIM base path must be provided to use agents.",
          );
        break;
      case "gemini":
        if (!process.env.GEMINI_API_KEY)
          throw new Error("Gemini API key must be provided to use agents.");
        break;
      case "docker-model-runner":
        if (!process.env.DOCKER_MODEL_RUNNER_BASE_PATH)
          throw new Error(
            "Docker Model Runner base path must be provided to use agents.",
          );
        break;
      case "opencode-zen":
        if (!process.env.OPENCODE_ZEN_BASE_PATH)
          throw new Error(
            "OpenCode Zen base path must be provided to use agents.",
          );
        break;
      default:
        throw new Error(
          "No workspace agent provider set. Please set your agent provider in the workspace's settings",
        );
    }
  }

  /**
   * Finds the default model for a given provider. If no default model is set for it's associated ENV then
   * it will return a reasonable base model for the provider if one exists.
   * @param {string} provider - The provider to find the default model for.
   * @returns {string|null} The default model for the provider.
   */
  providerDefault(provider = this.provider) {
    switch (provider) {
      case "openai":
        return process.env.OPEN_MODEL_PREF ?? "gpt-4o";
      case "anthropic":
        return process.env.ANTHROPIC_MODEL_PREF ?? "claude-3-sonnet-20240229";
      case "lmstudio":
        return process.env.LMSTUDIO_MODEL_PREF ?? null;
      case "ollama":
        return process.env.OLLAMA_MODEL_PREF ?? "llama3:latest";
      case "groq":
        return process.env.GROQ_MODEL_PREF ?? "llama3-70b-8192";
      case "localai":
        return process.env.LOCAL_AI_MODEL_PREF ?? null;
      case "mistral":
        return process.env.MISTRAL_MODEL_PREF ?? "mistral-medium";
      case "generic-openai":
        return process.env.GENERIC_OPEN_AI_MODEL_PREF ?? null;
      case "fireworksai":
        return process.env.FIREWORKS_AI_LLM_MODEL_PREF ?? null;
      case "litellm":
        return process.env.LITE_LLM_MODEL_PREF ?? null;
      case "xai":
        return process.env.XAI_LLM_MODEL_PREF ?? "grok-beta";
      case "nvidia-nim":
        return process.env.NVIDIA_NIM_LLM_MODEL_PREF ?? null;
      case "gemini":
        return process.env.GEMINI_LLM_MODEL_PREF ?? "gemini-2.0-flash-lite";
      case "docker-model-runner":
        return process.env.DOCKER_MODEL_RUNNER_LLM_MODEL_PREF ?? null;
      case "opencode-zen":
        return process.env.OPENCODE_ZEN_LLM_MODEL_PREF ?? null;
      default:
        return null;
    }
  }

  /**
   * Attempts to find a fallback provider and model to use if the workspace
   * does not have an explicit `agentProvider` and `agentModel` set.
   * 1. Fallback to the workspace `chatProvider` and `chatModel` if they exist.
   * 2. Fallback to the system `LLM_PROVIDER` and try to load the associated default model via ENV params or a base available model.
   * 3. Otherwise, return null - will likely throw an error the user can act on.
   * @returns {object|null} - An object with provider and model keys.
   */
  #getFallbackProvider() {
    // If workspace chat uses the model router, fall back to it.
    // Model is null here since the router determines it at resolve time.
    if (this.invocation.workspace.chatProvider === "opensin-router") {
      return { provider: "opensin-router", model: null };
    }

    // First, fallback to the workspace chat provider and model if they exist
    if (
      this.invocation.workspace.chatProvider &&
      this.invocation.workspace.chatModel
    ) {
      return {
        provider: this.invocation.workspace.chatProvider,
        model: this.invocation.workspace.chatModel,
      };
    }

    // If workspace does not have chat provider and model fallback
    // to system provider and try to load provider default model
    const systemProvider = process.env.LLM_PROVIDER;
    if (systemProvider === "opensin-router") {
      return { provider: "opensin-router", model: null };
    }

    const systemModel = this.providerDefault(systemProvider);
    if (systemProvider && systemModel) {
      return {
        provider: systemProvider,
        model: systemModel,
      };
    }

    return null;
  }

  /**
   * Finds or assumes the model preference value to use for API calls.
   * If multi-model loading is supported, we use their agent model selection of the workspace
   * If not supported, we attempt to fallback to the system provider value for the LLM preference
   * and if that fails - we assume a reasonable base model to exist.
   * @returns {string|null} the model preference value to use in API calls
   */
  #fetchModel() {
    // Provider was not explicitly set for workspace, so we are going to run our fallback logic
    // that will set a provider and model for us to use.
    if (!this.provider) {
      const fallback = this.#getFallbackProvider();
      if (!fallback) throw new Error("No valid provider found for the agent.");
      this.provider = fallback.provider; // re-set the provider to the fallback provider so it is not null.
      return fallback.model; // set its defined model based on fallback logic.
    }

    // The provider was explicitly set, so check if the workspace has an agent model set.
    if (this.invocation.workspace.agentModel)
      return this.invocation.workspace.agentModel;

    // Otherwise, we have no model to use - so guess a default model to use via the provider
    // and it's system ENV params and if that fails - we return either a base model or null.
    return this.providerDefault();
  }

  async #providerSetupAndCheck() {
    this.provider = this.invocation.workspace.agentProvider ?? null; // set provider to workspace agent provider if it exists
    this.model = this.#fetchModel();

    // If provider resolved to model router, resolve the actual provider/model
    if (this.provider === "opensin-router") {
      await this.#resolveRouterProvider();
    }

    if (!this.provider)
      throw new Error("No valid provider found for the agent.");
    this.log(`Start ${this.#invocationUUID}::${this.provider}:${this.model}`);
    this.checkSetup();
  }

  async #resolveRouterProvider(prompt = null) {
    const { OpenSINChatModelRouter } = require("../AiProviders/modelRouter");
    const routerWorkspace = this.invocation.workspace.router_id
      ? this.invocation.workspace
      : {
          ...this.invocation.workspace,
          router_id: process.env.MODEL_ROUTER_ID
            ? Number(process.env.MODEL_ROUTER_ID)
            : null,
        };

    // Resolve the thread slug from the numeric thread_id so the route cache key
    // matches the key used everywhere else.
    let thread = null;
    if (this.invocation.thread_id) {
      if (!this._threadSlug) {
        const { WorkspaceThread } = require("../../models/workspaceThread");
        const threadRecord = await WorkspaceThread.get({
          id: this.invocation.thread_id,
        });
        this._threadSlug = threadRecord?.slug || null;
      }
      thread = this._threadSlug ? { slug: this._threadSlug } : null;
    }

    const router = new OpenSINChatModelRouter(routerWorkspace);
    const { ModelRouterService } = require("../router");
    const workspace = this.invocation.workspace;
    const user = this.invocation.user_id
      ? { id: this.invocation.user_id }
      : null;
    const effectivePrompt = prompt || this.invocation.prompt;
    const ctx = await ModelRouterService.gatherRoutingContext({
      workspace,
      user,
      thread: this.invocation.thread_id
        ? { id: this.invocation.thread_id }
        : null,
      message: effectivePrompt,
    });

    await router.resolve(
      {
        prompt: effectivePrompt,
        conversationTokenCount: ctx.conversationTokenCount,
        conversationMessageCount: ctx.conversationMessageCount,
        attachments: this.attachments || [],
      },
      { user, thread },
    );

    this.provider = router.resolvedRoute.provider;
    this.model = router.resolvedRoute.model;
    this.routingMetadata = router.routingMetadata;
  }

  async #validInvocation() {
    const invocation = await WorkspaceAgentInvocation.getWithWorkspace({
      uuid: String(this.#invocationUUID),
    });
    if (invocation?.closed)
      throw new Error("This agent invocation is already closed");
    this.invocation = invocation ?? null;
  }

  parseCallOptions(args, config = {}, pluginName) {
    const callOpts = {};
    for (const [param, definition] of Object.entries(config)) {
      if (
        definition.required &&
        (!Object.prototype.hasOwnProperty.call(args, param) ||
          args[param] === null)
      ) {
        this.log(
          `'${param}' required parameter for '${pluginName}' plugin is missing. Plugin may not function or crash agent.`,
        );
        continue;
      }
      callOpts[param] = Object.prototype.hasOwnProperty.call(args, param)
        ? args[param]
        : definition.default || null;
    }
    return callOpts;
  }

  async #attachPlugins(args) {
    for (const name of this.#funcsToLoad) {
      // Load child plugin
      if (name.includes("#")) {
        const [parent, childPluginName] = name.split("#");
        if (!Object.prototype.hasOwnProperty.call(AgentPlugins, parent)) {
          this.log(
            `${parent} is not a valid plugin. Skipping inclusion to agent cluster.`,
          );
          continue;
        }

        const childPlugin = AgentPlugins[parent].plugin.find(
          (child) => child.name === childPluginName,
        );
        if (!childPlugin) {
          this.log(
            `${parent} does not have child plugin named ${childPluginName}. Skipping inclusion to agent cluster.`,
          );
          continue;
        }

        const callOpts = this.parseCallOptions(
          args,
          childPlugin?.startupConfig?.params,
          name,
        );
        this.aibitat.use(childPlugin.plugin(callOpts));
        this.log(
          `Attached ${parent}:${childPluginName} plugin to Agent cluster`,
        );
        continue;
      }

      // Load flow plugin. This is marked by `@@flow_` in the array of functions to load.
      // Replace the @@flow_ placeholder in the agent's function list with the actual
      // tool name so the function lookup in reply() can find it.
      if (name.startsWith("@@flow_")) {
        const uuid = name.replace("@@flow_", "");
        const plugin = AgentFlows.loadFlowPlugin(uuid, this.aibitat);
        if (!plugin) {
          this.log(
            `Flow ${uuid} not found in flows directory. Skipping inclusion to agent cluster.`,
          );
          continue;
        }

        this.aibitat.agents.get("@agent").functions = this.aibitat.agents
          .get("@agent")
          .functions.filter((f) => f !== name);
        this.aibitat.agents.get("@agent").functions.push(plugin.name);

        this.aibitat.use(plugin.plugin());
        this.log(
          `Attached flow ${plugin.name} (${plugin.flowName}) plugin to Agent cluster`,
        );
        continue;
      }

      // Load MCP plugin. This is marked by `@@mcp_` in the array of functions to load.
      // All sub-tools are loaded here and are denoted by `pluginName:toolName` as their identifier.
      // This will replace the parent MCP server plugin with the sub-tools as child plugins so they
      // can be called directly by the agent when invoked.
      // Since to get to this point, the `activeMCPServers` method has already been called, we can
      // safely assume that the MCP server is running and the tools are available/loaded.
      if (name.startsWith("@@mcp_")) {
        const mcpPluginName = name.replace("@@mcp_", "");
        const plugins =
          await new MCPCompatibilityLayer().convertServerToolsToPlugins(
            mcpPluginName,
            this.aibitat,
          );
        if (!plugins) {
          this.log(
            `MCP ${mcpPluginName} not found in MCP server config. Skipping inclusion to agent cluster.`,
          );
          continue;
        }

        // Remove the old function from the agent functions directly
        // and push the new ones onto the end of the array so that they are loaded properly.
        this.aibitat.agents.get("@agent").functions = this.aibitat.agents
          .get("@agent")
          .functions.filter((f) => f !== name);
        for (const plugin of plugins)
          this.aibitat.agents.get("@agent").functions.push(plugin.name);

        plugins.forEach((plugin) => {
          this.aibitat.use(plugin.plugin());
          this.log(
            `Attached MCP::${plugin.toolName} MCP tool to Agent cluster`,
          );
        });
        continue;
      }

      // Load imported plugin. This is marked by `@@` in the array of functions to load.
      // and is the @@hubID of the plugin.
      if (name.startsWith("@@")) {
        const hubId = name.replace("@@", "");
        const valid = ImportedPlugin.validateImportedPluginHandler(hubId);
        if (!valid) {
          this.log(
            `Imported plugin by hubId ${hubId} not found in plugin directory. Skipping inclusion to agent cluster.`,
          );
          continue;
        }

        const plugin = ImportedPlugin.loadPluginByHubId(hubId);
        const callOpts = plugin.parseCallOptions();
        this.aibitat.use(plugin.plugin(callOpts));
        this.log(
          `Attached ${plugin.name} (${hubId}) imported plugin to Agent cluster`,
        );
        continue;
      }

      // Load single-stage plugin.
      if (!Object.prototype.hasOwnProperty.call(AgentPlugins, name)) {
        this.log(
          `${name} is not a valid plugin. Skipping inclusion to agent cluster.`,
        );
        continue;
      }

      const callOpts = this.parseCallOptions(
        args,
        AgentPlugins[name].startupConfig?.params,
      );
      const AIbitatPlugin = AgentPlugins[name];
      this.aibitat.use(AIbitatPlugin.plugin(callOpts));
      this.log(`Attached ${name} plugin to Agent cluster`);
    }
  }

  async #loadAgents() {
    // Default User agent and workspace agent
    this.log(`Attaching user and default agent to Agent cluster.`);
    const user = this.invocation.user_id
      ? await User.get({ id: Number(this.invocation.user_id) })
      : null;

    const modeExtraRole = this.#modeSystemPrompt || "";
    const combinedExtraRole = [this.#urlPrompt, modeExtraRole]
      .filter(Boolean)
      .join("\n\n");

    const userAgentDef = await USER_AGENT.getDefinition();
    const workspaceAgentDef = await WORKSPACE_AGENT.getDefinition(
      this.provider,
      this.invocation.workspace,
      user,
      this.invocation.prompt,
      combinedExtraRole,
    );

    this.aibitat.agent(USER_AGENT.name, userAgentDef);
    this.aibitat.agent(WORKSPACE_AGENT.name, workspaceAgentDef);
    this.#funcsToLoad = [
      ...(userAgentDef?.functions || []),
      ...(workspaceAgentDef?.functions || []),
      // Phase 6: Always enable subagent spawning
      "subagent-spawner",
    ];
  }

  async init() {
    await this.#validInvocation();
    // If the invocation could not be resolved (e.g. an EventSource reconnect
    // arrives after the invocation was closed/removed), bail out cleanly instead
    // of dereferencing a null invocation in #providerSetupAndCheck(). The SSE
    // handler checks `!agentHandler.invocation` and closes the socket.
    if (!this.invocation) return this;
    await this.#providerSetupAndCheck();

    // Retrieve cached attachments (images, etc.) from the HTTP request
    this.attachments = getAndClearInvocationAttachments(this.#invocationUUID);
    // Retrieve any screenshot URL prompt instruction cached by the HTTP handler.
    this.#urlPrompt = getAndClearInvocationUrlPrompt(this.#invocationUUID);

    // Parse agent mode from the prompt early so the system prompt hint
    // can be injected into WORKSPACE_AGENT.getDefinition() during createAIbitat.
    this.#stripAgentCommand(this.invocation.prompt);

    return this;
  }

  /**
   * Fetch fresh parsed files and pinned documents, format them for injection into user messages.
   * Called on every chat turn to ensure context is always up-to-date.
   * @returns {Promise<string>} Formatted context string to append to user message
   */
  async #fetchParsedFileContext() {
    const user = this.invocation.user_id
      ? { id: this.invocation.user_id }
      : null;
    const thread = this.invocation.thread_id
      ? { id: this.invocation.thread_id }
      : null;
    const documentManager = new DocumentManager({
      workspace: this.invocation.workspace,
    });

    return Promise.all([
      WorkspaceParsedFiles.getContextFiles(
        this.invocation.workspace,
        thread,
        user,
      ),
      documentManager.pinnedDocs(),
    ])
      .then(([parsedFiles, pinnedDocs]) => {
        const allDocuments = [
          ...(parsedFiles || []).map((doc) => ({
            name: doc.title || "Uploaded Document",
            content: doc.pageContent,
          })),
          ...(pinnedDocs || []).map((doc) => ({
            name: doc.title || doc.metadata?.title || "Pinned Document",
            content: doc.pageContent,
          })),
        ];

        if (allDocuments.length === 0) return "";
        if (parsedFiles?.length > 0)
          this.log(
            `Injecting ${parsedFiles.length} parsed file(s) into user message`,
          );
        if (pinnedDocs?.length > 0)
          this.log(
            `Injecting ${pinnedDocs.length} pinned document(s) into user message`,
          );

        return (
          "\n\n<attached_documents>\n" +
          allDocuments
            .map((doc, i) => {
              const filename = doc.name || `Document ${i + 1}`;
              return `<document name="${filename}">\n${doc.content}\n</document>`;
            })
            .join("\n") +
          "\n</attached_documents>"
        );
      })
      .catch((e) => {
        this.log("Error fetching parsed file context", e.message);
        return "";
      });
  }

  async createAIbitat(
    args = {
      socket: null,
    },
  ) {
    this.aibitat = new AIbitat({
      provider: this.provider ?? "openai",
      model: this.model || process.env.FIREWORKS_AI_LLM_MODEL_PREF || "gpt-4o",
      chats: await this.#chatHistory(20),
      handlerProps: {
        invocation: this.invocation,
        log: this.log,
        routingMetadata: this.routingMetadata || null,
      },
    });

    // Phase 6: Pass run context to AIbitat so subagent plugin can access it
    if (this._runId) {
      this.aibitat._runId = this._runId;
      this.aibitat._workspaceSlug = this._workspaceSlug;
      this.aibitat._workspaceId = this.invocation?.workspace?.id;
      this.aibitat._scratchDir = this._scratchDir;
    }

    // Register callback to fetch fresh parsed file context on each chat turn
    // This injects parsed files into user messages instead of system prompt
    this.aibitat.fetchParsedFileContext = () => this.#fetchParsedFileContext();

    // If the workspace uses the model router, attach a resolver so routing
    // is re-evaluated on every agent turn instead of only at initialization.
    // Skip the first invocation since routing was already resolved during init()
    // and re-resolving would cause shouldNotify to return false (route already recorded).
    if (this.routingMetadata) {
      let isFirstCall = true;
      this.aibitat.resolveRoute = async (prompt) => {
        if (isFirstCall) {
          isFirstCall = false;
          return { provider: this.provider, model: this.model };
        }
        try {
          await this.#resolveRouterProvider(prompt);
          this.aibitat.handlerProps.routingMetadata =
            this.routingMetadata || null;
          return { provider: this.provider, model: this.model };
        } catch (e) {
          this.log(
            "Router re-resolution failed, keeping current route",
            e.message,
          );
          return null;
        }
      };
    }

    // Attach standard websocket plugin for frontend communication.
    this.log(`Attached ${AgentPlugins.websocket.name} plugin to Agent cluster`);
    this.aibitat.use(
      AgentPlugins.websocket.plugin({
        socket: args.socket,
        muteUserReply: true,
        introspection: true,
        userId: this.invocation.user_id || null,
      }),
    );

    // Attach standard chat-history plugin for message storage.
    this.log(
      `Attached ${AgentPlugins.chatHistory.name} plugin to Agent cluster`,
    );
    this.aibitat.use(AgentPlugins.chatHistory.plugin());

    // Load required agents (Default + custom)
    await this.#loadAgents();

    // Attach all required plugins for functions to operate.
    await this.#attachPlugins(args);
  }

  /**
   * Strip the @agent command from the message if it exists.
   * Prevents hallucination by the agent when the @agent command is used from the model thinking
   * it is an agent or something itself.
   * If the user sent nothing after the @agent command - assume its a greeting.
   * @param {string} message - The message to strip the @agent command from.
   * @returns {string} The message with the @agent command stripped.
   */
  #stripAgentCommand(message = "") {
    const { parseAgentModeFromPrompt } = require("./modeHints");
    const parsed = parseAgentModeFromPrompt(message);
    this.#modeSystemPrompt = parsed.systemPrompt;
    this.#activeMode = parsed.modeId;
    this.#activeSources = parsed.sources;
    if (parsed.modeId) {
      this.log(
        `Agent mode=${parsed.modeId} sources=[${parsed.sources.join(",") || "default"}]`,
      );
    }
    return parsed.cleanMessage;
  }

  #modeSystemPrompt = null;
  #activeMode = null;
  #activeSources = [];

  startAgentCluster() {
    const cleanContent = this.#stripAgentCommand(this.invocation.prompt);
    if (this.#modeSystemPrompt) {
      this.log(
        `Agent mode active: ${this.#modeSystemPrompt.substring(0, 80)}...`,
      );
    }
    return this.aibitat
      .start({
        from: USER_AGENT.name,
        to: this.channel ?? WORKSPACE_AGENT.name,
        content: cleanContent,
        attachments: this.attachments,
      })
      .then((result) => this.#postAgentLoop(result))
      .catch((err) => {
        this.#postAgentLoop(null);
        throw err;
      });
  }

  async #postAgentLoop(_result) {
    if (this.#activeMode !== "report") return;
    const pendingOutputs = this.aibitat?._pendingOutputs || [];
    const alreadyGenerated = pendingOutputs.some(
      (o) => o.type === "ReportFileDownload",
    );
    if (alreadyGenerated) return;

    const chats = this.aibitat?.chats || [];
    const lastAssistant = [...chats]
      .reverse()
      .find(
        (m) =>
          (m.from === "@agent" ||
            m.from === "workspace-agent" ||
            m.role === "assistant") &&
          m.content,
      );
    if (!lastAssistant?.content) return;

    this.log("Auto-generating PDF report from agent text response...");
    try {
      const { ReportGenerator } = require("../reports");
      const reportData = {
        title: "Agent Bericht",
        query: "",
        summary: lastAssistant.content,
        searchResults: [],
        politicianResults: [],
        extractedContent: [],
        template: "standard",
      };
      const result = await ReportGenerator.generate(reportData);
      const fileSizeBytes = Math.round(parseFloat(result.fileSizeKB) * 1024);
      const downloadUrl = `/api/utils/reports/${result.fileName}`;
      const versions = [
        { label: "Standardbericht", fileName: result.fileName, downloadUrl },
      ];

      this.aibitat?.socket?.send?.("reportPreview", {
        title: reportData.title,
        fileName: result.fileName,
        fileSizeKB: result.fileSizeKB,
        type: "pdf",
        downloadUrl,
        versions,
      });
      this.aibitat?.socket?.send?.("fileDownloadCard", {
        filename: result.fileName,
        fileSize: fileSizeBytes,
        downloadUrl,
        versions,
      });

      if (!this.aibitat._pendingOutputs) this.aibitat._pendingOutputs = [];
      this.aibitat._pendingOutputs.push({
        type: "ReportFileDownload",
        payload: {
          filename: result.fileName,
          fileSize: fileSizeBytes,
          downloadUrl,
          versions,
        },
      });

      const { WorkspaceChats } = require("../../models/workspaceChats");
      const lastChats = await WorkspaceChats.where(
        { workspaceId: Number(this.invocation.workspace_id) },
        5,
        { id: "desc" },
      );
      const lastChat = (Array.isArray(lastChats) ? lastChats : []).find(
        (c) => c.include === true || c.include === 1,
      );
      if (lastChat?.response) {
        const resp =
          typeof lastChat.response === "string"
            ? JSON.parse(lastChat.response)
            : lastChat.response;
        if (!resp.outputs) resp.outputs = [];
        resp.outputs.push({
          type: "ReportFileDownload",
          payload: {
            filename: result.fileName,
            fileSize: fileSizeBytes,
            downloadUrl,
            versions,
          },
        });
        await WorkspaceChats.upsert(lastChat.id, {
          workspaceId: Number(this.invocation.workspace_id),
          prompt: lastChat.prompt,
          response: resp,
          user: { id: this.invocation?.user_id || null },
          threadId: this.invocation?.thread_id || null,
          include: true,
        });
        this.log("Persisted auto-report output to chat history.");

        const { createArtifactsFromOutputs } = require("../artifacts/fromChat");
        createArtifactsFromOutputs({
          workspaceId: Number(this.invocation.workspace_id),
          threadId: this.invocation?.thread_id || null,
          chatId: lastChat.id,
          userId: this.invocation?.user_id || null,
          turnId: resp?.turnId || null,
          outputs: resp.outputs || [],
        }).catch((err) =>
          this.log(`Artifact creation failed: ${err.message}`),
        );
      }

      this.log(
        `Auto-generated PDF: ${result.fileName} (${result.fileSizeKB} KB)`,
      );
    } catch (error) {
      this.log("Auto-report generation failed:", error.message);
    }
  }
}

module.exports.AgentHandler = AgentHandler;
