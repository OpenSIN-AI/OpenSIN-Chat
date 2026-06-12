// SPDX-License-Identifier: MIT
const TRANSLATIONS = {
  onboarding: {
    home: {
      welcome: "Welcome",
      getStarted: "Get Started",
    },
    llm: {
      title: "LLM Preference",
      description:
        "OpenSIN Chat can work with many LLM providers. This will be the service which handles chatting.",
    },
    userSetup: {
      title: "User Setup",
      description: "Configure your user settings.",
      howManyUsers: "How many users will be using this instance?",
      justMe: "Just me",
      myTeam: "My team",
      instancePassword: "Instance Password",
      setPassword: "Would you like to set up a password?",
      passwordReq: "Passwords must be at least 8 characters.",
      passwordWarn:
        "It's important to save this password because there is no recovery method.",
      adminUsername: "Admin account username",
      adminPassword: "Admin account password",
      adminPasswordReq: "Passwords must be at least 8 characters.",
      teamHint:
        "By default, you will be the only admin. Once onboarding is completed you can create and invite others to be users or admins. Do not lose your password as only admins can reset passwords.",
    },
    data: {
      title: "Data Handling & Privacy",
      description:
        "We are committed to transparency and control when it comes to your personal data.",
      settingsHint:
        "These settings can be reconfigured at any time in the settings.",
    },
    survey: {
      title: "Welcome to OpenSIN Chat",
      description: "Help us make OpenSIN Chat built for your needs. Optional.",
      email: "What's your email?",
      useCase: "What will you use OpenSIN Chat for?",
      useCaseWork: "For work",
      useCasePersonal: "For personal use",
      useCaseOther: "Other",
      comment: "How did you hear about OpenSIN Chat?",
      commentPlaceholder:
        "Reddit, Twitter, GitHub, YouTube, etc. - Let us know how you found us!",
      skip: "Skip Survey",
      thankYou: "Thank you for your feedback!",
    },
  },
  common: {
    "workspaces-name": "Workspace Name",
    selection: "Model Selection",
    saving: "Saving...",
    save: "Save changes",
    previous: "Previous Page",
    next: "Next Page",
    optional: "Optional",
    yes: "Yes",
    no: "No",
    on: "On",
    none: "None",
    stopped: "Stopped",
    search: "Search",
    username_requirements:
      "Username must be 2-32 characters, start with a lowercase letter, and only contain lowercase letters, numbers, underscores, hyphens, and periods.",
    loading: "Loading",
    refresh: "Refresh",

    // Common UI strings - merged from second block (fix #120)
    show: "Show",
    hide: "Hide",
    submit: "Submit",
    off: "Off",
    saveChanges: "Save changes",
    logo: "Logo",
    updating: "Updating...",
    updateWorkspace: "Update Workspace",
    speakMessage: "Speak message",
    pauseSpeech: "Pause speech",
    openaiApiKey: "OpenAI API Key",
    userProfilePicture: "User profile picture",
    importing: "Importing...",
    thoughtsHide: "Hide thoughts",
    name: "Name",
    bearer: "Bearer",
    default: "Default",
    branch: "Branch",
    agentSkills: "Agent Skills",
    viewingText: "Viewing Text",
    viewThoughts: "View thoughts",
    provider: "Provider",
    openBuilder: "Open Builder",
    manager: "Manager",
    customSkills: "Custom Skills",
    createFlow: "Create Flow",
    chatEmbed: "Chat Embed",
    back: "Back",
    appIntegrations: "App Integrations",
    agentFlows: "Agent Flows",
    administrator: "Administrator",
    verifiedCode: "Verified code",
    verified: "Verified",
    variables: "Variables",
    users: "Users",
    url: "URL",
    unverified: "Unverified",
    unsavedChanges: "Unsaved Changes",
    stopDemo: "Stop demo",
    settings: "Settings",
    selectExperimentalFeature: "Select an experimental feature",
    selectAll: "Select All",
    rename: "Rename",
    readAccess: "Read access to the database schema",
    methods: {
      put: "PUT",
      post: "POST",
      patch: "PATCH",
      get: "GET",
      delete: "DELETE",
    },
  },

  webSearch: {
    getFreeApiKeySerpApi: "Get a free API key",
    fromSerpApi: "from SerpApi.",
    serpApiApiKey: "SerpApi API Key",
    getFreeApiKeySearchApi: "You can get a free API key",
    fromSearchApi: "from SearchApi.",
    searchApiApiKey: "SearchApi API Key",
    getFreeApiKeySerper: "You can get a free API key",
    fromSerper: "from Serper.dev.",
    serperApiKey: "Serper.dev API Key",
    getBingWebSearchSubscription:
      "You can get a Bing Web Search API subscription key",
    fromAzurePortal: "from the Azure portal.",
    bingWebSearchApiKey: "Bing Web Search API Key",
    bingSetupTitle: "To set up a Bing Web Search API subscription:",
    bingSetupStep1: "Go to the Azure portal:",
    bingSetupStep2:
      "Create a new Azure account or sign in with an existing one.",
    bingSetupStep3:
      'Navigate to the "Create a resource" section and search for "Grounding with Bing Search".',
    bingSetupStep4:
      'Select the "Grounding with Bing Search" resource and create a new subscription.',
    bingSetupStep5: "Choose the pricing tier that suits your needs.",
    bingSetupStep6:
      "Obtain the API key for your Grounding with Bing Search subscription.",
    getApiKey: "You can get an API key",
    fromBaidu: "from Baidu AI Cloud Qianfan.",
    baiduApiKey: "Baidu Search API Key",
    fromSerply: "from Serply.io.",
    serplyApiKey: "Serply API Key",
    searxngBaseUrl: "SearXNG API Base URL",
    searxngBaseUrlPlaceholder: "SearXNG API Base URL",
    fromTavily: "from Tavily.",
    tavilyApiKey: "Tavily API Key",
    duckduckgoNoConfig:
      "DuckDuckGo is ready to use without any additional configuration.",
    fromExa: "from Exa.",
    exaApiKey: "Exa API Key",
    fromPerplexity: "from Perplexity.",
    perplexityApiKey: "Perplexity API Key",
  },

  ollama: {
    advancedSettings: "advanced settings",
    showAdvanced: "Show",
    hideAdvanced: "Hide",
    baseUrlLabel: "Ollama Base URL",
    baseUrlTooltip: "Enter the URL where Ollama is running.",
    autoDetect: "Auto-Detect",
    keepAliveLabel: "Ollama Keep Alive",
    keepAliveTooltip:
      "Choose how long Ollama should keep your model in memory before unloading.",
    keepAliveLearnMore: "Learn more →",
    keepAliveNoCache: "No cache",
    keepAlive5Min: "5 minutes",
    keepAlive1Hour: "1 hour",
    keepAliveForever: "Forever",
    contextWindowLabel: "Model context window",
    contextWindowTooltip:
      "Specify the maximum number of tokens that can be used for the model context window.",
    contextWindowTooltip2:
      "If you leave this field blank, the context window limit will be auto-detected from the model and applied to all chats. If auto-detection fails, a fallback context window limit of 4096 will be used.",
    contextWindowTooltipImportant: "Important",
    contextWindowTooltipImportantText:
      "Some models have very large context windows using the full context window limit can dramatically increase the memory usage of your system. For this reason, we will automatically cap the context window limit to 16,384 tokens if the model supports more than that and no value is specified.",
    contextWindowTooltipFallback:
      "If an invalid value is entered, OpenSIN Chat will handle this for you so that chats do not fail.",
    contextWindowPlaceholder: "Automatically managed",
    authTokenLabel: "Authentication Token",
    authTokenTooltip1: "Enter a",
    authTokenTooltipBearer: "Bearer",
    authTokenTooltip1End: "Auth Token for interacting with your Ollama server.",
    authTokenTooltip2: "Used",
    authTokenTooltip2b: "only",
    authTokenTooltip2End: "if running Ollama behind an authentication server.",
    authTokenPlaceholder: "Ollama Auth Token",
    modelLabel: "Ollama Model",
    loadingModels: "-- loading available models --",
    enterUrlFirst: "Enter Ollama URL first",
    selectModelHelp:
      "Select the Ollama model you want to use. Models will load after entering a valid Ollama URL.",
    yourLoadedModels: "Your loaded models",
    chooseModelHelp:
      "Choose the Ollama model you want to use for your conversations.",
    baseUrlPlaceholder: "http://127.0.0.1:11434",
    autoDetected: "(auto-detected)",
  },

  ollamaEmbedding: {
    maxChunkLengthLabel: "Max embedding chunk length",
    maxChunkLengthTooltip:
      "Maximum length of text chunks, in characters, for embedding.",
    maxChunkLengthPlaceholder: "8192",
    hideAdvanced: "Hide",
    showAdvanced: "Show",
    advancedSettings: "Advanced Settings",
    hideAdvancedAria: "Hide advanced settings",
    showAdvancedAria: "Show advanced settings",
    baseUrlLabel: "Ollama Base URL",
    autoDetect: "Auto-Detect",
    autoDetectAria: "Auto-detect Ollama base URL",
    baseUrlPlaceholder: "http://127.0.0.1:11434",
    baseUrlHelp: "Enter the URL where Ollama is running.",
    batchSizeLabel: "Embedding batch size",
    batchSizeTooltip:
      "Number of text chunks to embed in parallel. Higher values improve speed but use more memory. Default is 1.",
    batchSizePlaceholder: "1",
    batchSizeHelp:
      "Increase this value to process multiple chunks simultaneously for faster embedding.",
    authTokenLabel: "Auth Token (optional)",
    authTokenPlaceholder: "Enter your Auth Token",
    authTokenHelp1: "Enter a",
    authTokenBearer: "Bearer",
    authTokenHelp1End: "Auth Token for interacting with your Ollama server.",
    authTokenHelp2: "Used",
    authTokenHelp2b: "only",
    authTokenHelp2End: "if running Ollama behind an authentication server.",
    modelLabel: "Ollama Embedding Model",
    loadingModels: "--loading available models--",
    enterUrlFirst: "Enter Ollama URL first",
    selectModelHelp:
      "Select the Ollama model for embeddings. Models will load after entering a valid Ollama URL.",
    yourLoadedModels: "Your loaded models",
    chooseModelHelp:
      "Choose the Ollama model you want to use for generating embeddings.",
  },

  providerSettings: {
    voyageAi: {
      apiKey: "API Key",
      modelPreference: "Model Preference",
      availableModels: "Available embedding models",
      apiKeyPlaceholder: "Voyage AI API Key",
    },
    lemonade: {
      baseUrl: "Base URL",
      autoDetect: "Auto-Detect",
      baseUrlTooltip1: "Enter the URL where the Lemonade is running.",
      baseUrlTooltip2:
        "You must have enabled the Lemonade TCP support for this to work.",
      learnMore: "Learn more",
      baseUrlPlaceholder: "http://localhost:13305",
      modelContextWindow: "Model context window",
      modelContextWindowTooltip:
        "The maximum number of tokens that can be used for a model context window. This must be set to a value that is supported by the model.",
      apiKeyOptional: "API Key (optional)",
      apiKeyTooltip: "The API key for your Lemonade server",
      tokenLimitPlaceholder: "8192",
      noModelsFound: "No models found!",
      downloadedModels: "Downloaded Models",
      uninstallConfirm:
        "Are you sure you want to uninstall this model? You will need to download it again to use it.",
      downloadConfirm:
        "Are you sure you want to download this model? It is {{fileSize}} in size and may take a while to download.",
    },
    cometApi: {
      apiKey: "CometAPI API Key",
      modelSelection: "Chat Model Selection",
      loadingModels: "-- loading available models --",
      typeOrSelectModel: "Type or select a model",
      modelInputHelp:
        "You can type the model id directly or pick from suggestions.",
      advancedSettings: "advanced settings",
      streamTimeout: "Stream Timeout (ms)",
      timeoutDescription:
        "Timeout value between token responses to auto-timeout the stream.",
    },
    genericOpenAi: {
      baseUrl: "Base URL",
      baseUrlPlaceholder: "eg: https://proxy.openai.com",
      apiKey: "API Key",
      apiKeyPlaceholder: "Generic service API Key",
      modelContextWindow: "Model context window",
      contextWindowPlaceholder: "Content window limit (eg: 4096)",
      maxTokens: "Max Tokens",
      maxTokensPlaceholder: "Max tokens per request (eg: 1024)",
      selectedModel: "Selected Model",
      loadingModels: "-- loading available models --",
      modelPlaceholder: "Model id used for chat requests",
      loadedModels: "Your loaded models",
    },
    anthropic: {
      apiKey: "Anthropic API Key",
      modelSelection: "Chat Model Selection",
      loadingModels: "-- loading available models --",
      advancedSettings: "advanced settings",
      promptCaching: "Prompt Caching",
      noCaching: "No caching",
      fiveMinutes: "5 minutes",
      oneHour: "1 hour",
    },
    dpais: {
      modelContextWindow: "Model context window",
      tokenLimitPlaceholder: "4096",
      advancedSettings: "advanced settings",
      baseUrl: "Dell Pro AI Studio Base URL",
      autoDetect: "Auto-Detect",
      baseUrlPlaceholder: "http://localhost:8553/v1/openai",
      modelSelection: "Chat Model Selection",
      loadingModels: "-- loading available models --",
      loadedModels: "Your loaded models",
    },
    litellm: {
      baseUrl: "Base URL",
      baseUrlPlaceholder: "http://127.0.0.1:4000",
      modelSelection: "Chat Model Selection",
      loadingModels: "-- loading available models --",
      waitingForUrl: "-- waiting for URL --",
      modelContextWindow: "Model context window",
      tokenLimitPlaceholder: "8192",
      apiKey: "API Key",
      apiKeyOptional: "optional",
      apiKeyPlaceholder: "sk-mysecretkey",
      loadedModels: "Your loaded models",
    },
    novita: {
      apiKey: "Novita API Key",
      apiKeyPlaceholder: "Novita API Key",
      modelSelection: "Chat Model Selection",
      loadingModels: "-- loading available models --",
      advancedSettings: "advanced settings",
      streamTimeout: "Stream Timeout (ms)",
      timeoutDescription:
        "Timeout value between token responses to auto-timeout the stream.",
    },
  },

  sqlConnection: {
    editTitle: "Edit SQL Connection",
    newTitle: "New SQL Connection",
    descriptionEdit:
      "Update the connection information for your database below.",
    descriptionNew:
      "Add the connection information for your database below and it will be available for future SQL agent calls.",
    warningLabel: "WARNING",
    warningText: "The SQL agent has been",
    warningInstructed: "instructed",
    warningToOnlyPerform: "to only perform non-modifying queries. This",
    warningDoesNotPrevent: "does not",
    warningDoesNotPrevent2:
      "prevent a hallucination from still deleting data. Only connect with a user who has",
    warningReadOnly: "READ_ONLY",
    warningReadOnly2: "permissions.",
    selectEngine: "Select your SQL engine",
    connectionName: "Connection name",
    connectionNamePlaceholder: "a unique name to identify this SQL connection",
    databaseUser: "Database user",
    databaseUserPlaceholder: "root",
    databasePassword: "Database user password",
    databasePasswordPlaceholder: "password123",
    serverEndpoint: "Server endpoint",
    serverEndpointPlaceholder: "the hostname or endpoint for your database",
    port: "Port",
    portPlaceholder: "3306",
    database: "Database",
    databasePlaceholder: "the database the agent will interact with",
    schemaOptional: "Schema (optional)",
    schemaPlaceholder: "public (default schema if not specified)",
    enableEncryption: "Enable Encryption",
    cancel: "Cancel",
    validating: "Validating...",
    saveConnection: "Save connection",
    duplicateError:
      'A connection with the name "{{name}}" already exists. Please choose a different name.',
    fillAllFields: "Please fill out all the fields above.",
    validationFailed:
      "Failed to validate connection. Please check your connection details.",
    connectionFailed:
      "Failed to establish database connection. Please check your connection details.",
  },

  pdfAnalysis: {
    crossCheck: {
      sectionLabel: "Cross verifications",
      sectionTitle: "Running & completed verifications",
      emptyText: "No cross verification started yet.",
      formTitle: "New cross verification",
      claimsLabel: "Claims (one per line)",
      claimsPlaceholder:
        "e.g. The funding program ends on 12/31/2026\nResponsibility lies with the state office",
      factIdsLabel: "Fact IDs from fact store (comma-separated, optional)",
      factIdsPlaceholder: "e.g. a1b2c3d4e5f6a7b8, b2c3d4e5f6a7b8c9",
      sourcesLegend: "Comparison sources",
      sourceTypeAriaLabel: "Source type",
      sourceValueAriaLabel: "Source value",
      sourceValuePdfPlaceholder: "/path/to/file.pdf (shared directory)",
      sourceValueTextPlaceholder: "Insert raw text…",
      sourceValueUrlPlaceholder: "https://…",
      removeSourceAriaLabel: "Remove source",
      removeSource: "Remove",
      addSource: "Add source",
      deepWebLabel:
        "Deep web research: Agents additionally research autonomously on the web",
      submitError1: "Please provide at least one claim or fact ID.",
      submitError2:
        "Please add at least one comparison source OR enable deep web research.",
      submitBusy: "Starting…",
      submitIdle: "Start verification",
      sourcesCount: "{{count}} comparison sources",
      deepWebActive: " · Deep web research active",
      moreClaims: " (+{{count}} more)",
      statusCompleted: "Completed",
      statusFailed: "Failed",
      statusResearching: "Agents researching",
      progressLabel: "{{done}}/{{total}} tasks",
      showReport: "Show report",
      cancel: "Cancel",
      modalAriaLabel: "Verification report",
      modalTitle: "Verification report",
      downloadReport: "Download as Markdown",
      closeAriaLabel: "Close",
      close: "Close",
      loading: "Loading…",
      webResearch: "Web ({{count}} sources):",
      perClaimAriaLabel: "Verdicts per claim",
      noReport: "No report available.",
    },
    sourceTypes: {
      url: "Website (URL)",
      youtube: "YouTube video",
      image: "Image (URL)",
      video: "Video file (URL)",
      pdf: "PDF (server path)",
      text: "Raw text",
    },
    verdicts: {
      supports: "Confirmed",
      contradicts: "Contradicts",
      inconclusive: "Unclear",
    },
  },
  home: {
    welcome: "Welcome",
    chooseWorkspace: "Choose a workspace to start chatting!",
    notAssigned:
      "You currently aren't assigned to any workspaces.\nPlease contact your administrator to request access to a workspace.",
    goToWorkspace: 'Go to "{{workspace}}"',
    logoAlt: "Logo",
  },
  settings: {
    title: "Instance Settings",
    invites: "Invites",
    users: "Users",
    workspaces: "Workspaces",
    "workspace-chats": "Workspace Chats",
    customization: "Customization",
    interface: "UI Preferences",
    branding: "Branding & Whitelabeling",
    chat: "Chat",
    "api-keys": "Developer API",
    llm: "LLM",
    transcription: "Transcription",
    embedder: "Embedder",
    "text-splitting": "Text Splitter & Chunking",
    "voice-speech": "Voice & Speech",
    "vector-database": "Vector Database",
    embeds: "Chat Embed",
    security: "Security",
    "event-logs": "Event Logs",
    "scheduled-jobs": "Scheduled Jobs",
    privacy: "Privacy & Data",
    "ai-providers": "AI Providers",
    "agent-skills": "Agent Skills",
    "model-router": "Model Router",
    "community-hub": {
      title: "Community Hub",
      trending: "Explore Trending",
      "your-account": "Your Account",
      "import-item": "Import Item",
    },
    admin: "Admin",
    tools: "Tools",
    "system-prompt-variables": "System Prompt Variables",
    "experimental-features": "Experimental Features",
    contact: "Contact Support",
    "browser-extension": "Browser Extension",
    "mobile-app": "OpenSIN Chat Mobile",
    channels: "Channels",
    "available-channels": {
      telegram: "Telegram",
    },
  },
  login: {
    "multi-user": {
      welcome: "Welcome",
      "placeholder-username": "Username",
      "placeholder-password": "Password",
      login: "Login",
      validating: "Validating...",
      "forgot-pass": "Forgot password",
      reset: "Reset",
    },
    "sign-in":
      "Enter your username and password to access your {{appName}} instance.",
    "password-reset": {
      title: "Password Reset",
      description:
        "Provide the necessary information below to reset your password.",
      "recovery-codes": "Recovery Codes",
      "back-to-login": "Back to Login",
    },
  },
  "main-page": {
    greeting: "How can I help you today?",
    workspaceSources: {
      title: "Workspace sources",
      add: "Add sources",
      empty:
        "No sources yet.\nUpload documents or add URLs to give the chat more context.",
      type_document: "Document",
      type_url: "URL",
      type_db: "Database",
    },
  },
  "new-workspace": {
    title: "New Workspace",
    placeholder: "My Workspace",
  },
  "workspaces—settings": {
    general: "General Settings",
    chat: "Chat Settings",
    vector: "Vector Database",
    members: "Members",
    agent: "Agent Configuration",
  },
  general: {
    vector: {
      title: "Vector Count",
      description: "Total number of vectors in your vector database.",
    },
    names: {
      description: "This will only change the display name of your workspace.",
    },
    message: {
      title: "Suggested Chat Messages",
      description:
        "Customize the messages that will be suggested to your workspace users.",
      add: "Add new message",
      save: "Save Messages",
      heading: "Explain to me",
      body: "the benefits of OpenSIN Chat",
    },
    delete: {
      title: "Delete Workspace",
      description:
        "Delete this workspace and all of its data. This will delete the workspace for all users.",
      delete: "Delete Workspace",
      deleting: "Deleting Workspace...",
      "confirm-start": "You are about to delete your entire",
      "confirm-end":
        "workspace. This will remove all vector embeddings in your vector database.\n\nThe original source files will remain untouched. This action is irreversible.",
    },
  },
  chat: {
    llm: {
      title: "Workspace LLM Provider",
      description:
        "The specific LLM provider & model that will be used for this workspace. By default, it uses the system LLM provider and settings.",
      search: "Search all LLM providers",
    },
    model: {
      title: "Workspace Chat model",
      description:
        "The specific chat model that will be used for this workspace. If empty, will use the system LLM preference.",
    },
    mode: {
      title: "Chat mode",
      automatic: {
        title: "Agent",
        description:
          "will automatically use tools if the model and provider support native tool calling.<br />If native tooling is not supported, you will need to use the @agent command to use tools.",
      },
      chat: {
        title: "Chat",
        description:
          "will provide answers with the LLM's general knowledge <b>and</b> document context that is found.<br />You will need to use the @agent command to use tools.",
      },
      query: {
        title: "Query",
        description:
          "will provide answers <b>only</b> if document context is found.<br />You will need to use the @agent command to use tools.",
      },
    },
    history: {
      title: "Chat History",
      "desc-start":
        "The number of previous chats that will be included in the response's short-term memory.",
      recommend: "Recommend 20. ",
      "desc-end":
        "Anything more than 45 is likely to lead to continuous chat failures depending on message size.",
    },
    prompt: {
      title: "System Prompt",
      description:
        "The prompt that will be used on this workspace. Define the context and instructions for the AI to generate a response. You should provide a carefully crafted prompt so the AI can generate a relevant and accurate response.",
      history: {
        title: "System Prompt History",
        clearAll: "Clear All",
        noHistory: "No system prompt history available",
        restore: "Restore",
        delete: "Delete",
        publish: "Publish to Community Hub",
        deleteConfirm: "Are you sure you want to delete this history item?",
        clearAllConfirm:
          "Are you sure you want to clear all history? This action cannot be undone.",
        expand: "Expand",
      },
    },
    refusal: {
      title: "Query mode refusal response",
      "desc-start": "When in",
      query: "query",
      "desc-end":
        "mode, you may want to return a custom refusal response when no context is found.",
      "tooltip-title": "Why am I seeing this?",
      "tooltip-description":
        "You are in query mode, which only uses information from your documents. Switch to chat mode for more flexible conversations, or click here to visit our documentation to learn more about chat modes.",
    },
    temperature: {
      title: "LLM Temperature",
      "desc-start":
        'This setting controls how "creative" your LLM responses will be.',
      "desc-end":
        "The higher the number the more creative. For some models this can lead to incoherent responses when set too high.",
      hint: "Most LLMs have various acceptable ranges of valid values. Consult your LLM provider for that information.",
    },
  },
  "vector-workspace": {
    identifier: "Vector database identifier",
    snippets: {
      title: "Max Context Snippets",
      description:
        "This setting controls the maximum amount of context snippets that will be sent to the LLM for per chat or query.",
      recommend: "Recommended: 4",
    },
    doc: {
      title: "Document similarity threshold",
      description:
        "The minimum similarity score required for a source to be considered related to the chat. The higher the number, the more similar the source must be to the chat.",
      zero: "No restriction",
      low: "Low (similarity score ≥ .25)",
      medium: "Medium (similarity score ≥ .50)",
      high: "High (similarity score ≥ .75)",
    },
    reset: {
      reset: "Reset Vector Database",
      resetting: "Clearing vectors...",
      confirm:
        "You are about to reset this workspace's vector database. This will remove all vector embeddings currently embedded.\n\nThe original source files will remain untouched. This action is irreversible.",
      error: "Workspace vector database could not be reset!",
      success: "Workspace vector database was reset!",
    },
  },
  agent: {
    "performance-warning":
      "Performance of LLMs that do not explicitly support tool-calling is highly dependent on the model's capabilities and accuracy. Some abilities may be limited or non-functional.",
    provider: {
      title: "Workspace Agent LLM Provider",
      description:
        "The specific LLM provider & model that will be used for this workspace's @agent agent.",
    },
    mode: {
      chat: {
        title: "Workspace Agent Chat model",
        description:
          "The specific chat model that will be used for this workspace's @agent agent.",
      },
      title: "Workspace Agent model",
      description:
        "The specific LLM model that will be used for this workspace's @agent agent.",
      wait: "-- waiting for models --",
    },
    skill: {
      rag: {
        title: "RAG & long-term memory",
        description:
          'Allow the agent to leverage your local documents to answer a query or ask the agent to "remember" pieces of content for long-term memory retrieval.',
      },
      view: {
        title: "View & summarize documents",
        description:
          "Allow the agent to list and summarize the content of workspace files currently embedded.",
      },
      scrape: {
        title: "Scrape websites",
        description:
          "Allow the agent to visit and scrape the content of websites.",
      },
      generate: {
        title: "Generate charts",
        description:
          "Enable the default agent to generate various types of charts from data provided or given in chat.",
      },
      web: {
        title: "Web Search",
        description:
          "Enable your agent to search the web to answer your questions by connecting to a web-search (SERP) provider.",
      },
      sql: {
        title: "SQL Connector",
        description:
          "Enable your agent to be able to leverage SQL to answer you questions by connecting to various SQL database providers.",
      },
      filesystem: {
        title: "File System Access",
        description:
          "Enable your agent to read, write, search, and manage files within a designated directory. Supports file editing, directory navigation, and content search.",
        learnMore: "Learn more about this how to use this skill",
        configuration: "Configuration",
        readActions: "Read Actions",
        writeActions: "Write Actions",
        warning:
          "Filesystem access can be dangerous as it can modify or delete files. Please consult the <a>documentation</a> before enabling.",
        skills: {
          "read-text-file": {
            title: "Read File",
            description:
              "Read contents of files (text, code, PDF, images, etc.)",
          },
          "read-multiple-files": {
            title: "Read Multiple Files",
            description: "Read multiple files at once",
          },
          "list-directory": {
            title: "List Directory",
            description: "List files and directories in a folder",
          },
          "search-files": {
            title: "Search Files",
            description: "Search for files by name or content",
          },
          "get-file-info": {
            title: "Get File Info",
            description: "Get detailed metadata about files",
          },
          "write-text-file": {
            title: "Write Text File",
            description:
              "Create new text files or overwrite existing text files",
          },
          "edit-file": {
            title: "Edit File",
            description: "Make line-based edits to text files",
          },
          "create-directory": {
            title: "Create Directory",
            description: "Create new directories",
          },
          "copy-file": {
            title: "Copy File",
            description: "Copy files and directories",
          },
          "move-file": {
            title: "Move/Rename File",
            description: "Move or rename files and directories",
          },
        },
      },
      createFiles: {
        title: "Document Creation",
        description:
          "Enable your agent to create binary document formats like PowerPoint presentations, Excel spreadsheets, Word documents, and PDFs. Files can be downloaded directly from the chat window.",
        configuration: "Available Document Types",
        skills: {
          "create-text-file": {
            title: "Text Files",
            description:
              "Create text files with any content and extension (.txt, .md, .json, .csv, etc.)",
          },
          "create-pptx": {
            title: "PowerPoint Presentations",
            description:
              "Create new PowerPoint presentations with slides, titles, and bullet points",
          },
          "create-pdf": {
            title: "PDF Documents",
            description:
              "Create PDF documents from markdown or plain text with basic styling",
          },
          "create-xlsx": {
            title: "Excel Spreadsheets",
            description:
              "Create Excel documents for tabular data with sheets and styling",
          },
          "create-docx": {
            title: "Word Documents",
            description:
              "Create Word documents with basic styling and formatting",
          },
          "read-pdf-file": {
            title: "Read PDF",
            description: "Extract text content from an existing PDF document",
          },
        },
      },
      image_generation: {
        title: "Image Generation",
        description:
          "Generate images using any OpenAI-compatible image generation API. Configure the endpoint, API key, and model below.",
        base_url: {
          label: "Base URL",
          required: "(required)",
          placeholder: "https://api.openai.com",
          help: "Base URL for the OpenAI-compatible API (e.g., {{example}})",
          invalid: "Please enter a valid http:// or https:// URL.",
        },
        api_key: {
          label: "API Key",
          help: "Leave empty to keep the existing key. The stored key is never shown in the browser.",
          clear: "Remove the stored API key on save",
        },
        model: {
          label: "Model",
          placeholder: "dall-e-3",
          help: "Model name for image generation. Common models are shown as suggestions.",
        },
      },
      gmail: {
        title: "GMail",
        description:
          "Enable your agent to interact with Gmail - search emails, read threads, compose drafts, send emails, and manage your inbox. <a>Read the documentation</a>.",
        multiUserWarning:
          "Gmail integration is not available in multi-user mode for security reasons. Please disable multi-user mode to use this feature.",
        configuration: "Gmail Configuration",
        deploymentId: "Deployment ID",
        deploymentIdHelp:
          "The deployment ID from your Google Apps Script web app",
        apiKey: "API Key",
        apiKeyHelp:
          "The API key you configured in your Google Apps Script deployment",
        configurationRequired:
          "Please configure the Deployment ID and API Key to enable Gmail skills.",
        configured: "Configured",
        searchSkills: "Search skills...",
        noSkillsFound: "No skills match your search.",
        categories: {
          search: {
            title: "Search & Read Emails",
            description: "Search and read emails from your Gmail inbox",
          },
          drafts: {
            title: "Draft Emails",
            description: "Create, edit, and manage email drafts",
          },
          send: {
            title: "Send & Reply to Emails",
            description: "Send emails and reply to threads immediately",
          },
          threads: {
            title: "Manage Email Threads",
            description:
              "Manage email threads - mark read/unread, archive, trash",
          },
          account: {
            title: "Integration Statistics",
            description: "View mailbox statistics and account information",
          },
        },
        skills: {
          getInbox: {
            title: "Get Inbox",
            description: "Streamlined way to get the inbox emails from Gmail",
          },
          search: {
            title: "Search Emails",
            description: "Search emails using Gmail query syntax",
          },
          readThread: {
            title: "Read Thread",
            description: "Read a full email thread by ID",
          },
          createDraft: {
            title: "Create Draft",
            description: "Create a new draft email",
          },
          createDraftReply: {
            title: "Create Draft Reply",
            description: "Create a draft reply to an existing thread",
          },
          updateDraft: {
            title: "Update Draft",
            description: "Update an existing draft email",
          },
          getDraft: {
            title: "Get Draft",
            description: "Retrieve a specific draft by ID",
          },
          listDrafts: {
            title: "List Drafts",
            description: "List all draft emails",
          },
          deleteDraft: {
            title: "Delete Draft",
            description: "Delete a draft email",
          },
          sendDraft: {
            title: "Send Draft",
            description: "Send an existing draft email",
          },
          sendEmail: {
            title: "Send Email",
            description: "Send an email immediately",
          },
          replyToThread: {
            title: "Reply to Thread",
            description: "Reply to an email thread immediately",
          },
          markRead: {
            title: "Mark Read",
            description: "Mark a thread as read",
          },
          markUnread: {
            title: "Mark Unread",
            description: "Mark a thread as unread",
          },
          moveToTrash: {
            title: "Move to Trash",
            description: "Move a thread to trash",
          },
          moveToArchive: {
            title: "Archive",
            description: "Archive a thread",
          },
          moveToInbox: {
            title: "Move to Inbox",
            description: "Move a thread to inbox",
          },
          getMailboxStats: {
            title: "Mailbox Stats",
            description: "Get unread counts and mailbox statistics",
          },
        },
      },
      googleCalendar: {
        title: "Google Calendar",
        description:
          "Enable your agent to interact with Google Calendar - view calendars, get events, create and update events, and manage RSVPs. <a>Read the documentation</a>.",
        multiUserWarning:
          "Google Calendar integration is not available in multi-user mode for security reasons. Please disable multi-user mode to use this feature.",
        configuration: "Google Calendar Configuration",
        deploymentId: "Deployment ID",
        deploymentIdHelp:
          "The deployment ID from your Google Apps Script web app",
        apiKey: "API Key",
        apiKeyHelp:
          "The API key you configured in your Google Apps Script deployment",
        configurationRequired:
          "Please configure the Deployment ID and API Key to enable Google Calendar skills.",
        configured: "Configured",
        searchSkills: "Search skills...",
        noSkillsFound: "No skills match your search.",
        categories: {
          calendars: {
            title: "Calendars",
            description: "View and manage your Google Calendars",
          },
          readEvents: {
            title: "Read Events",
            description: "View and search calendar events",
          },
          writeEvents: {
            title: "Create & Update Events",
            description: "Create new events and modify existing ones",
          },
          rsvp: {
            title: "RSVP Management",
            description: "Manage your response status for events",
          },
        },
        skills: {
          listCalendars: {
            title: "List Calendars",
            description: "List all calendars you own or are subscribed to",
          },
          getCalendar: {
            title: "Get Calendar Details",
            description: "Get detailed information about a specific calendar",
          },
          getEvent: {
            title: "Get Event",
            description: "Get detailed information about a specific event",
          },
          getEventsForDay: {
            title: "Get Events for Day",
            description: "Get all events scheduled for a specific day",
          },
          getEvents: {
            title: "Get Events (Date Range)",
            description: "Get events within a custom date range",
          },
          getUpcomingEvents: {
            title: "Get Upcoming Events",
            description:
              "Get events for today, this week, or this month using simple keywords",
          },
          quickAdd: {
            title: "Quick Add Event",
            description:
              "Create an event from natural language (e.g., 'Meeting tomorrow at 3pm')",
          },
          createEvent: {
            title: "Create Event",
            description:
              "Create a new event with full control over all properties",
          },
          updateEvent: {
            title: "Update Event",
            description: "Update an existing calendar event",
          },
          setMyStatus: {
            title: "Set RSVP Status",
            description: "Accept, decline, or tentatively accept an event",
          },
        },
      },
      outlook: {
        title: "Outlook",
        description:
          "Enable your agent to interact with Microsoft Outlook - search emails, read threads, compose drafts, send emails, and manage your inbox via Microsoft Graph API. <a>Read the documentation</a>.",
        multiUserWarning:
          "Outlook integration is not available in multi-user mode for security reasons. Please disable multi-user mode to use this feature.",
        configuration: "Outlook Configuration",
        authType: "Account Type",
        authTypeHelp:
          "Choose which types of Microsoft accounts can authenticate. 'All accounts' supports both personal and work/school accounts. 'Personal only' restricts to personal Microsoft accounts. 'Organization only' restricts to work/school accounts from a specific Azure AD tenant.",
        authTypeCommon: "All accounts (personal & work/school)",
        authTypeConsumers: "Personal Microsoft accounts only",
        authTypeOrganization: "Organization accounts only (requires Tenant ID)",
        clientId: "Application (Client) ID",
        clientIdHelp:
          "The Application (Client) ID from your Azure AD app registration",
        tenantId: "Directory (Tenant) ID",
        tenantIdHelp:
          "The Directory (Tenant) ID from your Azure AD app registration. Required only for organization-only authentication.",
        clientSecret: "Client Secret",
        clientSecretHelp:
          "The client secret value from your Azure AD app registration",
        configurationRequired:
          "Please configure the Client ID and Client Secret to enable Outlook skills.",
        authRequired:
          "Save your credentials first, then authenticate with Microsoft to complete the setup.",
        authenticateWithMicrosoft: "Authenticate with Microsoft",
        authenticated: "Successfully authenticated with Microsoft Outlook.",
        revokeAccess: "Revoke Access",
        configured: "Configured",
        searchSkills: "Search skills...",
        noSkillsFound: "No skills match your search.",
        categories: {
          search: {
            title: "Search & Read Emails",
            description: "Search and read emails from your Outlook inbox",
          },
          drafts: {
            title: "Draft Emails",
            description: "Create, edit, and manage email drafts",
          },
          send: {
            title: "Send Emails",
            description: "Send new emails or reply to messages immediately",
          },
          account: {
            title: "Integration Statistics",
            description: "View mailbox statistics and account information",
          },
        },
        skills: {
          getInbox: {
            title: "Get Inbox",
            description: "Get recent emails from your Outlook inbox",
          },
          search: {
            title: "Search Emails",
            description: "Search emails using Microsoft Search syntax",
          },
          readThread: {
            title: "Read Conversation",
            description: "Read a full email conversation thread",
          },
          createDraft: {
            title: "Create Draft",
            description:
              "Create a new draft email or draft reply to an existing message",
          },
          updateDraft: {
            title: "Update Draft",
            description: "Update an existing draft email",
          },
          listDrafts: {
            title: "List Drafts",
            description: "List all draft emails",
          },
          deleteDraft: {
            title: "Delete Draft",
            description: "Delete a draft email",
          },
          sendDraft: {
            title: "Send Draft",
            description: "Send an existing draft email",
          },
          sendEmail: {
            title: "Send Email",
            description:
              "Send a new email or reply to an existing message immediately",
          },
          getMailboxStats: {
            title: "Mailbox Stats",
            description: "Get folder counts and mailbox statistics",
          },
        },
      },
      default_skill:
        "By default, this skill is enabled, but you can disable it if you don't want it to be available to the agent.",
    },
    mcp: {
      title: "MCP Servers",
      "loading-from-config": "Loading MCP Servers from configuration file",
      "learn-more": "Learn more about MCP Servers.",
      "no-servers-found": "No MCP servers found",
      "tool-warning":
        "For the best performance, consider disabling unwanted tools to conserve context.",
      "tools-enabled": "tools enabled",
      "stop-server": "Stop MCP Server",
      "start-server": "Start MCP Server",
      "delete-server": "Delete MCP Server",
      "tool-count-warning":
        "This MCP server has <b>{{count}} tools enabled</b> that will consume context in every chat.<br />Consider disabling unwanted tools to conserve context.",
      "startup-command": "Startup Command",
      command: "Command",
      arguments: "Arguments",
      "not-running-warning":
        "This MCP server is not running - it may be stopped or experiencing an error on startup.",
      "tool-call-arguments": "Tool call arguments",
    },
    settings: {
      title: "Agent Skill Settings",
      "max-tool-calls": {
        title: "Max Tool Calls Per Response",
        description:
          "The maximum number of tools an agent can chain to generate a single response. This prevents runaway tool calls and infinite loops.",
      },
      "intelligent-skill-selection": {
        title: "Intelligent Skill Selection",
        "beta-badge": "Beta",
        description:
          "Enable unlimited tools and cut token usage by up to 80% per query — OpenSIN Chat automatically selects the right skills for every prompt.",
        "max-tools": {
          title: "Max Tools",
          description:
            "The maximum number of tools to select for each query. We recommend setting this to higher values for larger context models.",
        },
      },
      "clarifying-questions": {
        title: "Allow agent to ask clarifying questions",
        "beta-badge": "BETA",
        description:
          "When enabled, agents can pause to ask short clarifying questions if your prompt is ambiguous.",
        "max-per-turn": {
          title: "Max questions per turn",
          description:
            "How many clarifying questions the agent may ask in a single survey.",
        },
      },
    },
  },
  recorded: {
    title: "Workspace Chats",
    description:
      "These are all the recorded chats and messages that have been sent by users ordered by their creation date.",
    export: "Export",
    table: {
      id: "ID",
      by: "Sent By",
      workspace: "Workspace",
      prompt: "Prompt",
      response: "Response",
      at: "Sent At",
    },
  },
  preview: {
    loading: "Loading preview...",
    load_error: "Preview could not be loaded.",
    generated_image: "Generated image",
    open_externally: "Open in new tab",
    iframe_title: "Preview",
    menu: {
      download: "Download",
      open_new_tab: "Open in new tab",
      add_to_sources: "Add to sources",
    },
    empty:
      "No content to preview. Generate a report or document to view it here.",
    title: "Preview",
    unknown_file: "Unknown file",
    open: "Preview",
    download: "Download",
    downloading: "Downloading...",
  },
  customization: {
    interface: {
      title: "UI Preferences",
      description: "Set your UI preferences for OpenSIN Chat.",
    },
    branding: {
      title: "Branding & Whitelabeling",
      description:
        "White-label your OpenSIN Chat instance with custom branding.",
    },
    chat: {
      title: "Chat",
      description: "Set your chat preferences for OpenSIN Chat.",
      auto_submit: {
        title: "Auto-Submit Speech Input",
        description:
          "Automatically submit speech input after a period of silence",
      },
      auto_speak: {
        title: "Auto-Speak Responses",
        description: "Automatically speak responses from the AI",
      },
      spellcheck: {
        title: "Enable Spellcheck",
        description: "Enable or disable spellcheck in the chat input field",
      },
    },
    items: {
      theme: {
        title: "Theme",
        description: "Select your preferred color theme for the application.",
      },
      "show-scrollbar": {
        title: "Show Scrollbar",
        description: "Enable or disable the scrollbar in the chat window.",
      },
      "support-email": {
        title: "Support Email",
        description:
          "Set the support email address that should be accessible by users when they need help.",
      },
      "app-name": {
        title: "Name",
        description:
          "Set a name that is displayed on the login page to all users.",
      },
      "display-language": {
        title: "Display Language",
        description:
          "Select the preferred language to render OpenSIN Chat's UI in - when translations are available.",
      },
      logo: {
        title: "Brand Logo",
        description: "Upload your custom logo to showcase on all pages.",
        add: "Add a custom logo",
        recommended: "Recommended size: 800 x 200",
        remove: "Remove",
        replace: "Replace",
      },
      "browser-appearance": {
        title: "Browser Appearance",
        description:
          "Customize the appearance of the browser tab and title when the app is open.",
        tab: {
          title: "Title",
          description:
            "Set a custom tab title when the app is open in a browser.",
        },
        favicon: {
          title: "Favicon",
          description: "Use a custom favicon for the browser tab.",
        },
      },
      "sidebar-footer": {
        title: "Sidebar Footer Items",
        description:
          "Customize the footer items displayed on the bottom of the sidebar.",
        icon: "Icon",
        link: "Link",
      },
      "render-html": {
        title: "Render HTML in chat",
        description:
          "Render HTML responses in assistant responses.\nThis can result in a much higher fidelity of response quality, but can also lead to potential security risks.",
      },
    },
  },
  api: {
    title: "API Keys",
    description:
      "API keys allow the holder to programmatically access and manage this OpenSIN Chat instance.",
    link: "Read the API documentation",
    generate: "Generate New API Key",
    empty: "No API keys found",
    actions: "Actions",
    messages: {
      error: "Error: {{error}}",
    },
    modal: {
      title: "Create new API key",
      cancel: "Cancel",
      close: "Close",
      create: "Create API Key",
      helper:
        "Once created the API key can be used to programmatically access and configure this OpenSIN Chat instance.",
      name: {
        label: "Name",
        placeholder: "Production integration",
        helper:
          "Optional. Use a friendly name so you can identify this key later.",
      },
    },
    row: {
      copy: "Copy API Key",
      copied: "Copied",
      unnamed: "--",
      deleteConfirm:
        "Are you sure you want to deactivate this api key?\nAfter you do this it will not longer be useable.\n\nThis action is irreversible.",
    },
    table: {
      name: "Name",
      key: "API Key",
      by: "Created By",
      created: "Created",
    },
  },
  llm: {
    title: "LLM Preference",
    description:
      "These are the credentials and settings for your preferred LLM chat & embedding provider. It is important that these keys are current and correct, or else OpenSIN Chat will not function properly.",
    provider: "LLM Provider",
    providers: {
      azure_openai: {
        azure_service_endpoint: "Azure Service Endpoint",
        api_key: "API Key",
        chat_deployment_name: "Chat Deployment Name",
        chat_model_token_limit: "Chat Model Token Limit",
        model_type: "Model Type",
        model_type_tooltip:
          "If your deployment uses a reasoning model (o1, o1-mini, o3-mini, etc.), set this to “Reasoning”. Otherwise, your chat requests may fail.",
        default: "Default",
        reasoning: "Reasoning",
      },
    },
  },
  "model-router": {
    title: "Model Routers",
    description:
      "Model routers let you define rules to automatically route chat messages to different LLM providers and models based on conditions.",
    table: {
      name: "Name",
      fallback: "Fallback",
      rules: "Rules",
      workspaces: "Workspaces",
    },
    "no-routers": "No model routers yet",
    "empty-description":
      "No model routers configured yet. Create one to get started.",
    "new-router-button": "New Router",
    "delete-confirm":
      'Are you sure you want to delete the router "{{name}}"?\nThis will remove all its rules and unlink any workspaces using it.\n\nThis action is irreversible.',
    "toast-deleted": "Router deleted",
    "toast-delete-failed": "Failed to delete router: {{error}}",
    "new-router": {
      title: "Create New Model Router",
      name: "Name",
      "name-placeholder": "e.g. Cost Optimizer",
      description: "Description",
      "description-placeholder": "Optional description",
      "fallback-label": "Primary Provider & Model",
      "fallback-description":
        "Used when no routing rule matches. Also used to evaluate LLM-classified rules.",
      "cooldown-label": "Cache Cooldown (seconds)",
      "cooldown-help":
        "How long a routing decision is cached before re-evaluating rules. Set to 0 to disable caching.",
      "name-required": "Name is required.",
      "fallback-required": "Primary provider and model are required.",
      cancel: "Cancel",
      create: "Create Router",
    },
    "edit-router": {
      "back-to-routers": "Back to Model Routers",
      title: "Edit Router: {{name}}",
      save: "Save Changes",
      "toast-update-failed": "Failed to update router",
    },
    rules: {
      title: "Routing Rules",
      "title-with-name": "Router Rules: {{name}}",
      description:
        "Define the rules that determine when and how chat messages go to specific providers and models.",
      "add-rule": "Add Rule",
      "delete-confirm": 'Delete rule "{{title}}"?',
      "toast-delete-failed": "Failed to delete rule",
      "toast-reorder-failed": "Failed to reorder rules",
      "no-rules": "No rules yet",
      "empty-description":
        "Add a rule to start routing chat messages to specific providers and models.",
      "new-rule-button": "New Rule",
      "calculated-section-label":
        "Calculated rules — evaluated first, in priority order",
      "llm-section-label":
        "LLM rules — evaluated as a batch if no calculated rule matched",
      "llm-rule-body":
        'Match <desc>"{{description}}"</desc> then route to <route>{{route}}</route>',
      "calculated-no-conditions":
        "No conditions — route to <route>{{route}}</route>",
      "calculated-single-condition":
        'If <prop>{{property}}</prop> {{comparator}} <val>"{{value}}"</val> then route to <route>{{route}}</route>',
      "calculated-multi-condition":
        "If {{quantifier}} of <cond>{{conditions}}</cond> then route to <route>{{route}}</route>",
      "comparator-contains": "contains",
      "comparator-matches": "matches",
      "comparator-between": "between",
      "badge-llm": "LLM",
      "badge-calculated": "Calculated",
      "aria-drag-to-reorder": "Drag to reorder",
      "aria-edit-rule": "Edit rule",
      "aria-delete-rule": "Delete rule",
      "quantifier-any": "ANY",
      "quantifier-all": "ALL",
    },
    "rule-form": {
      "title-label": "Title",
      "rule-type": "Rule Type",
      "property-label": "Property",
      "property-select": "Select",
      "comparator-label": "Comparator",
      "comparator-select": "Select",
      "value-label": "Value",
      "add-condition": "Add condition",
      "remove-condition": "Remove condition",
      "conditions-incomplete":
        "Condition {{index}} is incomplete — fill in property, comparator, and value.",
      "match-description-label": "Match Description",
      "match-description-placeholder":
        "e.g. The user is asking about legal topics, contracts, or compliance",
      "match-description-help":
        "Describe the situation when you want this rule to match. This is evaluated by your LLM to determine if it should be used.",
      "route-to-label": "Route to Provider & Model",
      "route-to-description": "When this rule matches, use this provider/model",
      cancel: "Cancel",
      saving: "Saving...",
      "update-rule": "Update Rule",
      "create-rule": "Create Rule",
      "title-required": "Title is required",
      "toast-save-failed": "Failed to save rule",
      "type-calculated-label": "Calculated",
      "type-calculated-description":
        "Match based on message properties like content, token count, or time of day.",
      "type-llm-label": "LLM Classified",
      "type-llm-description":
        "Use an LLM to classify the message based on a description you provide.",
      "prop-prompt-content": "Prompt Content",
      "prop-token-count": "Conversation Token Count",
      "prop-message-count": "Conversation Message Count",
      "prop-current-hour": "Current Hour (0-23)",
      "prop-has-image": "Has Image Attachment",
      "cmp-contains": "contains",
      "cmp-matches-regex": "matches (regex)",
      "cmp-equals": "equals",
      "cmp-not-equals": "not equals",
      "cmp-greater-than": "greater than",
      "cmp-greater-than-or-equal": "greater than or equal",
      "cmp-less-than": "less than",
      "cmp-less-than-or-equal": "less than or equal",
      "cmp-between": "between (inclusive)",
      "placeholder-between-hour": "e.g. 9,17 (9am to 5pm)",
      "placeholder-between-numeric": "e.g. 10,50",
      "placeholder-hour": "e.g. 18 (0-23)",
      "placeholder-message-count": "e.g. 10",
      "placeholder-numeric": "e.g. 4000",
      "placeholder-contains": "e.g. code, python, rust",
      "placeholder-matches": "e.g. /\\bpython\\b/i",
      "placeholder-default": "e.g. code",
      "help-contains":
        "Comma-separated list — matches if the prompt contains any of the values (case-insensitive).",
      "help-matches":
        "Regex pattern. Use /pattern/flags for case sensitivity (defaults to case-insensitive).",
      "bool-true": "True",
      "bool-false": "False",
    },
    "provider-picker": {
      "select-provider": "Select provider",
      "setup-required": "(setup required)",
      "loading-models": "Loading models...",
      "select-model": "Select model",
      "enter-model": "Enter model name",
      "select-provider-first": "Select a provider first",
      "configure-to-continue": "Configure {{name}} to continue",
      "configure-provider": "Configure {{name}}",
      "setup-credentials":
        "Enter the required credentials to use {{name}} as a routing target.",
      cancel: "Cancel",
      "save-settings": "Save settings",
      "toast-save-failed": "Failed to save settings: {{error}}",
    },
    "router-selection": {
      "loading-routers": "Loading custom routers...",
      "no-routers-prefix-settings": "No model routers configured yet.",
      "no-routers-prefix-workspace": "No model routers configured.",
      "no-routers-link": "Create one in Model Router settings",
      "model-router-label": "Model Router",
      "select-router": "Select a router",
      "select-description": "Select which router to use for this workspace.",
      "no-routers-chat":
        "No routers configured. Create one in Settings > AI Providers > Model Router.",
      "rule-count": "({{count}} rules)",
    },
    metrics: {
      "model-router-default": "Model Router",
    },
    chat: {
      "select-router-error": "Select a router",
      "invalid-model": "Invalid model selection",
      "routed-to": "Routed to <route>{{model}}</route>",
      "routed-to-rule":
        "Routed to <route>{{model}}</route> via <rule>{{ruleTitle}}</rule>",
    },
  },
  transcription: {
    title: "Transcription Model Preference",
    description:
      "These are the credentials and settings for your preferred transcription model provider. Its important these keys are current and correct or else media files and audio will not transcribe.",
    provider: "Transcription Provider",
    "warn-start":
      "Using the local whisper model on machines with limited RAM or CPU can stall OpenSIN Chat when processing media files.",
    "warn-recommend":
      "We recommend at least 2GB of RAM and upload files <10Mb.",
    "warn-end":
      "The built-in model will automatically download on the first use.",
  },
  embedding: {
    title: "Embedding Preference",
    "desc-start":
      "When using an LLM that does not natively support an embedding engine - you may need to additionally specify credentials for embedding text.",
    "desc-end":
      "Embedding is the process of turning text into vectors. These credentials are required to turn your files and prompts into a format which OpenSIN Chat can use to process.",
    provider: {
      title: "Embedding Provider",
    },
  },
  text: {
    title: "Text splitting & Chunking Preferences",
    "desc-start":
      "Sometimes, you may want to change the default way that new documents are split and chunked before being inserted into your vector database.",
    "desc-end":
      "You should only modify this setting if you understand how text splitting works and it's side effects.",
    size: {
      title: "Text Chunk Size",
      description:
        "This is the maximum length of characters that can be present in a single vector.",
      recommend: "Embed model maximum length is",
    },
    overlap: {
      title: "Text Chunk Overlap",
      description:
        "This is the maximum overlap of characters that occurs during chunking between two adjacent text chunks.",
    },
  },
  vector: {
    title: "Vector Database",
    description:
      "These are the credentials and settings for how your OpenSIN Chat instance will function. It's important these keys are current and correct.",
    provider: {
      title: "Vector Database Provider",
      description: "There is no configuration needed for LanceDB.",
    },
  },
  embeddable: {
    title: "Embeddable Chat Widgets",
    description:
      "Embeddable chat widgets are public facing chat interfaces that are tied to a single workspace. These allow you to build workspaces that then you can publish to the world.",
    create: "Create embed",
    table: {
      workspace: "Workspace",
      chats: "Sent Chats",
      active: "Active Domains",
      created: "Created",
    },
  },
  "embed-chats": {
    title: "Embed Chat History",
    export: "Export",
    description:
      "These are all the recorded chats and messages from any embed that you have published.",
    table: {
      embed: "Embed",
      sender: "Sender",
      message: "Message",
      response: "Response",
      at: "Sent At",
    },
  },
  telegram: {
    title: "Telegram Bot",
    description:
      "Connect your OpenSIN Chat instance to Telegram so you can chat with your workspaces from any device.",
    setup: {
      step1: {
        title: "Step 1: Create your Telegram bot",
        description:
          "Open @BotFather in Telegram, send <code>/newbot</code> to <code>@BotFather</code>, follow the prompts, and copy the API token.",
        "open-botfather": "Open BotFather",
        "instruction-1": "1. Open the link or scan the QR code",
        "instruction-2":
          "2. Send <code>/newbot</code> to <code>@BotFather</code>",
        "instruction-3": "3. Choose a name and username for your bot",
        "instruction-4": "4. Copy the API token you receive",
      },
      step2: {
        title: "Step 2: Connect your bot",
        description:
          "Paste the API token you received from @BotFather to connect your bot.",
        "bot-token": "Bot Token",
        connecting: "Connecting...",
        "connect-bot": "Connect Bot",
      },
      security: {
        title: "Recommended Security Settings",
        description:
          "For additional security, configure these settings in @BotFather.",
        "disable-groups": "— Prevent adding bot to groups",
        "disable-inline": "— Prevent bot from being used in inline search",
        "obscure-username":
          "Use a non-obvious bot handle username to reduce discoverability",
      },
      "toast-enter-token": "Please enter a bot token.",
      "toast-connect-failed": "Failed to connect bot.",
    },
    connected: {
      status: "Connected",
      "status-disconnected": "Disconnected — token may be expired or invalid",
      "placeholder-token": "Paste new bot token...",
      reconnect: "Reconnect",
      workspace: "Workspace",
      "bot-link": "Bot Link",
      "voice-response": "Voice Response",
      disconnecting: "Disconnecting...",
      disconnect: "Disconnect",
      "voice-text-only": "Text only",
      "voice-mirror": "Mirror (reply with voice when user sends voice)",
      "voice-always": "Always voice (send audio with every reply)",
      "toast-disconnect-failed": "Failed to disconnect bot.",
      "toast-reconnect-failed": "Failed to reconnect bot.",
      "toast-voice-failed": "Failed to update voice mode.",
      "toast-approve-failed": "Failed to approve user.",
      "toast-deny-failed": "Failed to deny user.",
      "toast-revoke-failed": "Failed to revoke user.",
    },
    users: {
      "pending-description":
        "Users waiting to be verified. Match the pairing code shown here with the one displayed in their Telegram chat.",
      unknown: "Unknown",
    },
  },
  security: {
    title: "Security",
    multiuser: {
      title: "Multi-User Mode",
      description:
        "Set up your instance to support your team by activating Multi-User Mode.",
      enable: {
        "is-enable": "Multi-User Mode is Enabled",
        enable: "Enable Multi-User Mode",
        description:
          "By default, you will be the only admin. As an admin you will need to create accounts for all new users or admins. Do not lose your password as only an Admin user can reset passwords.",
        username: "Admin account username",
        password: "Admin account password",
      },
    },
    password: {
      title: "Password Protection",
      description:
        "Protect your OpenSIN Chat instance with a password. If you forget this there is no recovery method so ensure you save this password.",
      "password-label": "Instance Password",
    },
  },
  event: {
    title: "Event Logs",
    description:
      "View all actions and events happening on this instance for monitoring.",
    clear: "Clear Event Logs",
    table: {
      type: "Event Type",
      user: "User",
      occurred: "Occurred At",
    },
  },
  privacy: {
    title: "Privacy & Data-Handling",
    description:
      "This is your configuration for how connected third party providers and OpenSIN Chat handle your data.",
    anonymous: "Anonymous Telemetry Enabled",
  },
  connectors: {
    "search-placeholder": "Search data connectors",
    "no-connectors": "No data connectors found.",
    obsidian: {
      vault_location: "Vault Location",
      vault_description:
        "Select your Obsidian vault folder to import all notes and their connections.",
      selected_files: "Found {{count}} markdown files",
      importing: "Importing vault...",
      import_vault: "Import Vault",
      processing_time:
        "This may take a while depending on the size of your vault.",
      vault_warning:
        "To avoid any conflicts, make sure your Obsidian vault is not currently open.",
    },
    github: {
      name: "GitHub Repo",
      description:
        "Import an entire public or private GitHub repository in a single click.",
      URL: "GitHub Repo URL",
      URL_explained: "Url of the GitHub repo you wish to collect.",
      token: "GitHub Access Token",
      optional: "optional",
      token_explained: "Access Token to prevent rate limiting.",
      token_explained_start: "Without a ",
      token_explained_link1: "Personal Access Token",
      token_explained_middle:
        ", the GitHub API may limit the number of files that can be collected due to rate limits. You can ",
      token_explained_link2: "create a temporary Access Token",
      token_explained_end: " to avoid this issue.",
      ignores: "File Ignores",
      git_ignore:
        "List in .gitignore format to ignore specific files during collection. Press enter after each entry you want to save.",
      task_explained:
        "Once complete, all files will be available for embedding into workspaces in the document picker.",
      branch: "Branch you wish to collect files from.",
      branch_loading: "-- loading available branches --",
      branch_explained: "Branch you wish to collect files from.",
      token_information:
        "Without filling out the <b>GitHub Access Token</b> this data connector will only be able to collect the <b>top-level</b> files of the repo due to GitHub's public API rate-limits.",
      token_personal:
        "Get a free Personal Access Token with a GitHub account here.",
    },
    gitlab: {
      name: "GitLab Repo",
      description:
        "Import an entire public or private GitLab repository in a single click.",
      URL: "GitLab Repo URL",
      URL_explained: "URL of the GitLab repo you wish to collect.",
      token: "GitLab Access Token",
      optional: "optional",
      token_description:
        "Select additional entities to fetch from the GitLab API.",
      token_explained_start: "Without a ",
      token_explained_link1: "Personal Access Token",
      token_explained_middle:
        ", the GitLab API may limit the number of files that can be collected due to rate limits. You can ",
      token_explained_link2: "create a temporary Access Token",
      token_explained_end: " to avoid this issue.",
      fetch_issues: "Fetch Issues as Documents",
      ignores: "File Ignores",
      git_ignore:
        "List in .gitignore format to ignore specific files during collection. Press enter after each entry you want to save.",
      task_explained:
        "Once complete, all files will be available for embedding into workspaces in the document picker.",
      branch: "Branch you wish to collect files from",
      branch_loading: "-- loading available branches --",
      branch_explained: "Branch you wish to collect files from.",
      token_information:
        "Without filling out the <b>GitLab Access Token</b> this data connector will only be able to collect the <b>top-level</b> files of the repo due to GitLab's public API rate-limits.",
      token_personal:
        "Get a free Personal Access Token with a GitLab account here.",
    },
    youtube: {
      name: "YouTube Transcript",
      description:
        "Import the transcription of an entire YouTube video from a link.",
      URL: "YouTube Video URL",
      URL_explained_start:
        "Enter the URL of any YouTube video to fetch its transcript. The video must have ",
      URL_explained_link: "closed captions",
      URL_explained_end: " available.",
      task_explained:
        "Once complete, the transcript will be available for embedding into workspaces in the document picker.",
    },
    "website-depth": {
      name: "Bulk Link Scraper",
      description: "Scrape a website and its sub-links up to a certain depth.",
      URL: "Website URL",
      URL_explained: "URL of the website you want to scrape.",
      depth: "Crawl Depth",
      depth_explained:
        "This is the number of child-links that the worker should follow from the origin URL.",
      max_pages: "Maximum Pages",
      max_pages_explained: "Maximum number of links to scrape.",
      task_explained:
        "Once complete, all scraped content will be available for embedding into workspaces in the document picker.",
    },
    confluence: {
      name: "Confluence",
      description: "Import an entire Confluence page in a single click.",
      deployment_type: "Confluence deployment type",
      deployment_type_explained:
        "Determine if your Confluence instance is hosted on Atlassian cloud or self-hosted.",
      base_url: "Confluence base URL",
      base_url_explained: "This is the base URL of your Confluence space.",
      space_key: "Confluence space key",
      space_key_explained:
        "This is the spaces key of your confluence instance that will be used. Usually begins with ~",
      username: "Confluence Username",
      username_explained: "Your Confluence username",
      auth_type: "Confluence Auth Type",
      auth_type_explained:
        "Select the authentication type you want to use to access your Confluence pages.",
      auth_type_username: "Username and Access Token",
      auth_type_personal: "Personal Access Token",
      token: "Confluence Access Token",
      token_explained_start:
        "You need to provide an access token for authentication. You can generate an access token",
      token_explained_link: "here",
      token_desc: "Access token for authentication",
      pat_token: "Confluence Personal Access Token",
      pat_token_explained: "Your Confluence personal access token.",
      bypass_ssl: "Bypass SSL Certificate Validation",
      bypass_ssl_explained:
        "Enable this option to bypass SSL certificate validation for self-hosted confluence instances with self-signed certificate",
      task_explained:
        "Once complete, the page content will be available for embedding into workspaces in the document picker.",
    },
    manage: {
      documents: "Documents",
      "data-connectors": "Data Connectors",
      "desktop-only":
        "Editing these settings are only available on a desktop device. Please access this page on your desktop to continue.",
      dismiss: "Dismiss",
      editing: "Editing",
    },
    directory: {
      "my-documents": "My Documents",
      "new-folder": "New Folder",
      "total-documents_one": "{{count}} document",
      "total-documents_other": "{{count}} documents",
      "search-document": "Search for document",
      "no-documents": "No Documents",
      "move-workspace": "Move to Workspace",
      "delete-confirmation":
        "Are you sure you want to delete these files and folders?\nThis will remove the files from the system and remove them from any existing workspaces automatically.\nThis action is not reversible.",
      "removing-message":
        "Removing {{count}} documents and {{folderCount}} folders. Please wait.",
      "move-success": "Successfully moved {{count}} documents.",
      no_docs: "No Documents",
      select_all: "Select All",
      deselect_all: "Deselect All",
      remove_selected: "Remove Selected",
      save_embed: "Save and Embed",
    },
    upload: {
      "processor-offline": "Document Processor Unavailable",
      "processor-offline-desc":
        "We can't upload your files right now because the document processor is offline. Please try again later.",
      "click-upload": "Click to upload or drag and drop",
      "file-types":
        "supports text files, csv's, spreadsheets, audio files, and more!",
      "or-submit-link": "or submit a link",
      "placeholder-link": "https://example.com",
      fetching: "Fetching...",
      "fetch-website": "Fetch website",
      "privacy-notice":
        "These files will be uploaded to the document processor running on this OpenSIN Chat instance. These files are not sent or shared with a third party.",
    },
    pinning: {
      what_pinning: "What is document pinning?",
      pin_explained_block1:
        "When you <b>pin</b> a document in OpenSIN Chat we will inject the entire content of the document into your prompt window for your LLM to fully comprehend.",
      pin_explained_block2:
        "This works best with <b>large-context models</b> or small files that are critical to its knowledge-base.",
      pin_explained_block3:
        "If you are not getting the answers you desire from OpenSIN Chat by default then pinning is a great way to get higher quality answers in a click.",
      accept: "Okay, got it",
    },
    watching: {
      what_watching: "What does watching a document do?",
      watch_explained_block1:
        "When you <b>watch</b> a document in OpenSIN Chat we will <i>automatically</i> sync your document content from it's original source on regular intervals. This will automatically update the content in every workspace where this file is managed.",
      watch_explained_block2:
        "This feature currently supports online-based content and will not be available for manually uploaded documents.",
      watch_explained_block3_start:
        "You can manage what documents are watched from the ",
      watch_explained_block3_link: "File manager",
      watch_explained_block3_end: " admin view.",
      accept: "Okay, got it",
    },
  },
  chat_window: {
    attachments_processing: "Attachments are processing. Please wait...",
    send_message: "Send a message",
    attach_file: "Attach a file to this chat",
    text_size: "Change text size.",
    microphone: "Speak your prompt.",
    stt_unsupported: "Microphone access is not supported in this browser.",
    stt_mic_denied:
      "Could not access the microphone. Please grant permission and try again.",
    stt_transcription_failed: "Transcription failed: {{error}}",
    send: "Send prompt message to workspace",
    tts_speak_message: "TTS Speak message",
    copy: "Copy",
    regenerate: "Regenerate",
    regenerate_response: "Regenerate response",
    good_response: "Good response",
    more_actions: "More actions",
    sources: "Sources",
    attach_menu: {
      add_files: "Add files",
      current_sources: "Current sources",
      add_from_url: "Add from URL",
      loading: "Loading...",
      no_sources: "No sources available",
      no_workspace:
        "No workspace available. Send a message first to create a workspace.",
      add_success: "Source added to workspace",
      add_failed: "Could not add source",
      url_hint:
        "Paste the URL of a website or YouTube video to add it as a source.",
      url_submit: "Add source",
      url_submitting: "Adding...",
      url_success: "URL added as source",
      url_failed: "Could not add URL",
    },
    source_filter_label: "Source Filter",
    source_filter_all: "All",
    source_filter_documents: "Documents",
    source_filter_media: "Media",
    no_sources_filter: "No sources found for filter '{{filter}}'",
    workspace_sources: "Workspace Sources",
    no_workspace_sources:
      "No workspace sources available. Add documents, links, or APIs in workspace settings.",
    source_count_one: "{{count}} reference",
    source_count_other: "{{count}} references",
    document: "Document",
    similarity_match: "match",
    fork: "Fork",
    delete: "Delete",
    cancel: "Cancel",
    submit: "Submit",
    edit_prompt: "Edit prompt",
    edit_response: "Edit response",
    edit_info_user:
      '"Submit" regenerates the AI response. "Save" updates your message only.',
    edit_info_assistant:
      "Your changes will be saved directly to this response.",
    see_less: "See Less",
    see_more: "See More",
    preset_reset_description: "Clear your chat history and begin a new chat",
    add_new_preset: " Add New Preset",
    add_new: "Add new",
    edit: "Edit",
    publish: "Publish",
    stop_generating: "Stop generating response",
    command: "Command",
    your_command: "your-command",
    placeholder_prompt:
      "This is the content that will be injected in front of your prompt.",
    description: "Description",
    placeholder_description: "Responds with a poem about LLMs.",
    save: "Save",
    small: "Small",
    normal: "Normal",
    large: "Large",
    tools: "Tools",
    text_size_label: "Text Size",
    select_model: "Select Model",
    slash_commands: "Slash Commands",
    agent_skills: "Agent Skills",
    manage_agent_skills: "Manage Agent Skills",
    app_integrations: "App Integrations",
    custom_skills: "Custom Skills",
    agent_flows: "Agent Flows",
    sub_skills: "Sub-skills",
    no_tools_found: "No matching tools found",
    loading_mcp_servers: "Loading MCP servers...",
    start_agent_session: "Start Agent Session",
    agent_skills_disabled_in_session:
      "Can't modify skills during an active agent session. Use /exit to end the session first.",
    use_agent_session_to_use_tools:
      "You can use tools in chat by starting an agent session with '@agent' at the beginning of your prompt.",
    workspace_llm_manager: {
      search: "Search",
      loading_workspace_settings: "Loading workspace settings...",
      available_models: "Available Models for {{provider}}",
      available_models_description: "Select a model to use for this workspace.",
      save: "Use this model",
      saving: "Setting model as workspace default...",
      missing_credentials: "This provider is missing credentials!",
      missing_credentials_description: "Set up now",
    },
    agent_invocation: {
      model_wants_to_call: "Model wants to call",
      approve: "Approve",
      reject: "Reject",
      always_allow: "Always allow {{skillName}}",
      tool_call_was_approved: "Tool call was approved",
      tool_call_was_rejected: "Tool call was rejected",
      clarifying_skip: "Let agent decide",
      clarifying_submit: "Submit",
      clarifying_skipped: "You let the agent decide.",
      clarifying_timeout: "No response submitted in time.",
      clarifying_pagination: "{{current}} of {{total}}",
      clarifying_prev_aria: "Previous question",
      clarifying_next_aria: "Next question",
      clarifying_close_aria: "Close and skip",
      clarifying_other: "Other",
      clarifying_other_placeholder: "Type your answer",
      batch_progress: "{{answered}} of {{total}} answered",
      batch_skip_this: "Skip",
      batch_submit_all: "Submit all",
      batch_next: "Next",
      answer_skipped: "[user skipped]",
    },
    memories: {
      title: "Memories",
      empty:
        "No memories so far. After you interact with the chatbot more memories will fill in or",
      empty_cta: "create a new memory",
      tab_workspace: "Workspace",
      tab_global: "Global",
      toggle: {
        label: "Enable Personalization",
        description:
          "Allow your assistant to recall facts about you or this workspace and use them in conversations",
      },
      auto_extraction: {
        label: "Automatic Memories",
        description:
          "Have your assistant automatically create memories in the background",
      },
      menu: {
        edit: "Edit",
        delete: "Delete",
        move_to_global: "Move to Global",
        move_to_workspace: "Move to Workspace",
      },
      modal: {
        create_title: "Create Memory",
        edit_title: "Edit Memory",
        create_description:
          'Memories should be a single, concise statement. e.g. "User prefers Python over JavaScript"',
        edit_description: "Update the content of this memory.",
        label: "Memory",
        placeholder:
          "e.g. User's name is Joe, User works on OpenSIN Chat, etc.",
        create: "Create",
        save: "Save",
        cancel: "Cancel",
      },
    },
  },
  profile_settings: {
    edit_account: "Edit Account",
    profile_picture: "Profile Picture",
    remove_profile_picture: "Remove Profile Picture",
    username: "Username",
    new_password: "New Password",
    password_description: "Password must be at least 8 characters long",
    cancel: "Cancel",
    update_account: "Update Account",
    theme: "Theme Preference",
    language: "Preferred language",
    failed_upload: "Failed to upload profile picture: {{error}}",
    upload_success: "Profile picture uploaded.",
    failed_remove: "Failed to remove profile picture: {{error}}",
    profile_updated: "Profile updated.",
    failed_update_user: "Failed to update user: {{error}}",
    account: "Account",
    support: "Support",
    signout: "Sign out",
  },
  "keyboard-shortcuts": {
    title: "Keyboard Shortcuts",
    shortcuts: {
      settings: "Open Settings",
      workspaceSettings: "Open Current Workspace Settings",
      home: "Go to Home",
      workspaces: "Manage Workspaces",
      apiKeys: "API Keys Settings",
      llmPreferences: "LLM Preferences",
      chatSettings: "Chat Settings",
      help: "Show keyboard shortcuts help",
      showLLMSelector: "Show workspace LLM Selector",
    },
  },
  community_hub: {
    publish: {
      system_prompt: {
        success_title: "Success!",
        success_description:
          "Your System Prompt has been published to the Community Hub!",
        success_thank_you: "Thank you for sharing to the Community!",
        view_on_hub: "View on Community Hub",
        modal_title: "Publish System Prompt",
        name_label: "Name",
        name_description: "This is the display name of your system prompt.",
        name_placeholder: "My System Prompt",
        description_label: "Description",
        description_description:
          "This is the description of your system prompt. Use this to describe the purpose of your system prompt.",
        tags_label: "Tags",
        tags_description:
          "Tags are used to label your system prompt for easier searching. You can add multiple tags. Max 5 tags. Max 20 characters per tag.",
        tags_placeholder: "Type and press Enter to add tags",
        visibility_label: "Visibility",
        public_description: "Public system prompts are visible to everyone.",
        private_description: "Private system prompts are only visible to you.",
        publish_button: "Publish to Community Hub",
        submitting: "Publishing...",
        prompt_label: "Prompt",
        prompt_description:
          "This is the actual system prompt that will be used to guide the LLM.",
        prompt_placeholder: "Enter your system prompt here...",
      },
      agent_flow: {
        success_title: "Success!",
        success_description:
          "Your Agent Flow has been published to the Community Hub!",
        success_thank_you: "Thank you for sharing to the Community!",
        view_on_hub: "View on Community Hub",
        modal_title: "Publish Agent Flow",
        name_label: "Name",
        name_description: "This is the display name of your agent flow.",
        name_placeholder: "My Agent Flow",
        description_label: "Description",
        description_description:
          "This is the description of your agent flow. Use this to describe the purpose of your agent flow.",
        tags_label: "Tags",
        tags_description:
          "Tags are used to label your agent flow for easier searching. You can add multiple tags. Max 5 tags. Max 20 characters per tag.",
        tags_placeholder: "Type and press Enter to add tags",
        visibility_label: "Visibility",
        submitting: "Publishing...",
        submit: "Publish to Community Hub",
        privacy_note:
          "Agent flows are always uploaded as private to protect any sensitive data. You can change the visibility in the Community Hub after publishing. Please verify your flow does not contain any sensitive or private information before publishing.",
      },
      slash_command: {
        success_title: "Success!",
        success_description:
          "Your Slash Command has been published to the Community Hub!",
        success_thank_you: "Thank you for sharing to the Community!",
        view_on_hub: "View on Community Hub",
        modal_title: "Publish Slash Command",
        name_label: "Name",
        name_description: "This is the display name of your slash command.",
        name_placeholder: "My Slash Command",
        description_label: "Description",
        description_description:
          "This is the description of your slash command. Use this to describe the purpose of your slash command.",
        tags_label: "Tags",
        tags_description:
          "Tags are used to label your slash command for easier searching. You can add multiple tags. Max 5 tags. Max 20 characters per tag.",
        tags_placeholder: "Type and press Enter to add tags",
        visibility_label: "Visibility",
        public_description: "Public slash commands are visible to everyone.",
        private_description: "Private slash commands are only visible to you.",
        publish_button: "Publish to Community Hub",
        submitting: "Publishing...",
        prompt_label: "Prompt",
        prompt_description:
          "This is the prompt that will be used when the slash command is triggered.",
        prompt_placeholder: "Enter your prompt here...",
      },
      generic: {
        unauthenticated: {
          title: "Authentication Required",
          description:
            "You need to authenticate with the OpenSIN Chat Community Hub before publishing items.",
          button: "Connect to Community Hub",
        },
      },
    },
  },
  scheduledJobs: {
    title: "Scheduled Jobs",
    enableNotifications: "Enable browser notifications for job results",
    description:
      "Create recurring AI tasks that run on a schedule. Each job runs a prompt with optional tools and saves the result for review.",
    newJob: "New Job",
    loading: "Loading...",
    emptyTitle: "No Scheduled Jobs yet",
    emptySubtitle: "Create one to get started.",
    table: {
      name: "Name",
      schedule: "Schedule",
      status: "Status",
      lastRun: "Last Run",
      nextRun: "Next Run",
      actions: "Actions",
    },
    confirmDelete: "Are you sure you want to delete this scheduled job?",
    status: {
      completed: "Completed",
      failed: "Failed",
      timed_out: "Timed out",
      running: "Running",
      queued: "Queued",
    },
    toast: {
      deleted: "Job deleted",
      triggered: "Job triggered successfully",
      triggerFailed: "Failed to trigger job",
      triggerSkipped: "A run is already in progress for this job",
      killed: "Job stopped successfully",
      killFailed: "Failed to stop job",
    },
    row: {
      neverRun: "Never run",
      viewRuns: "View runs",
      runNow: "Run now",
      enable: "Enable",
      disable: "Disable",
      edit: "Edit",
      delete: "Delete",
    },
    modal: {
      titleEdit: "Edit Scheduled Job",
      titleNew: "New Scheduled Job",
      nameLabel: "Name",
      namePlaceholder: "e.g. Daily News Digest",
      promptLabel: "Prompt",
      promptPlaceholder: "The instruction to run on each execution...",
      scheduleLabel: "Schedule",
      modeBuilder: "Builder",
      modeCustom: "Custom",
      cronPlaceholder: "Cron expression (e.g. 0 9 * * *)",
      currentSchedule: "Current schedule:",
      toolsLabel: "Tools (Optional)",
      toolsDescription:
        "Select which agent tools this job can use. If none are selected, the job runs without any tools.",
      toolsSearch: "Search",
      toolsNoResults: "No tools match",
      required: "Required",
      requiredFieldsBanner:
        "Please fill out all required fields in order to create job.",
      cancel: "Cancel",
      saving: "Saving...",
      updateJob: "Update Job",
      createJob: "Create Job",
      jobUpdated: "Job updated",
      jobCreated: "Job created",
    },
    builder: {
      fallbackWarning:
        "This expression can't be edited visually. Switch to Custom to keep it, or change anything below to overwrite it.",
      run: "Run",
      frequency: {
        minute: "every minute",
        hour: "hourly",
        day: "daily",
        week: "weekly",
        month: "monthly",
      },
      every: "Every",
      minuteOne: "1 minute",
      minuteOther: "{{count}} minutes",
      atMinute: "At minute",
      pastEveryHour: "past every hour",
      at: "At",
      on: "On",
      onDay: "On day",
      ofEveryMonth: "of every month",
      weekdays: {
        sun: "Sun",
        mon: "Mon",
        tue: "Tue",
        wed: "Wed",
        thu: "Thu",
        fri: "Fri",
        sat: "Sat",
      },
    },
    runHistory: {
      back: "Back to jobs",
      title: "Run History: {{name}}",
      schedule: "Schedule:",
      emptyTitle: "No runs yet for this job",
      emptySubtitle: "Run the job now and view its results.",
      runNow: "Run Now",
      stopJob: "Stop job",
      table: {
        status: "Status",
        started: "Started",
        duration: "Duration",
        error: "Error",
      },
    },
    runDetail: {
      loading: "Loading run details...",
      notFound: "Run not found.",
      back: "Back",
      unknownJob: "Unknown Job",
      runHeading: "{{name}} — Run #{{id}}",
      duration: "Duration: {{value}}",
      continueInThread: "Continue in Chat",
      creating: "Creating...",
      threadFailed: "Failed to create thread",
      stopJob: "Stop Job",
      killing: "Stopping...",
      sections: {
        prompt: "Prompt",
        error: "Error",
        thinking: "Thoughts ({{count}})",
        toolCalls: "Tool Calls ({{count}})",
        files: "Files ({{count}})",
        response: "Response",
        metrics: "Metrics",
      },
      metrics: {
        promptTokens: "Prompt tokens:",
        completionTokens: "Completion tokens:",
      },
    },
    toolCall: {
      arguments: "Arguments:",
      showResult: "Show result",
      hideResult: "Hide result",
    },
    file: {
      unknown: "Unknown file",
      download: "Download",
      downloadFailed: "Failed to download file",
      types: {
        powerpoint: "PowerPoint",
        pdf: "PDF Document",
        word: "Word Document",
        spreadsheet: "Spreadsheet",
        generic: "File",
      },
    },
  },

  apiCallNode: {
    url: "URL",
    urlPlaceholder: "https://api.example.com/endpoint",
    insertVariable: "Insert variable",
    selectVariableToInsert: "Select variable to insert",
    method: "Method",
    headers: "Headers",
    addHeader: "Add header",
    headerName: "Header name",
    headerValue: "Value",
    removeHeader: "Remove header",
    requestBody: "Request Body",
    json: "JSON",
    rawText: "Raw Text",
    formData: "Form Data",
    jsonPlaceholder: '{"key": "value"}',
    formKey: "Key",
    formValue: "Value",
    removeField: "Remove field",
    addFormField: "Add Form Field",
    rawRequestBody: "Raw request body...",
    storeResponseIn: "Store Response In",
    selectOrCreateVariable: "Select or create variable",
  },

  drupalWiki: {
    baseUrlLabel: "Drupal Wiki base URL",
    baseUrlDescription: "This is the base URL of your <a>Drupal Wiki</a>.",
    baseUrlPlaceholder:
      "eg: https://mywiki.drupal-wiki.net, https://drupalwiki.mycompany.tld, etc...",
    spaceIdsLabel: "Drupal Wiki Space IDs",
    spaceIdsDescription:
      "Comma separated Space IDs you want to extract. See the <a>manual</a> on how to retrieve the Space IDs. Be sure that your 'API-Token User' has access to those spaces.",
    spaceIdsPlaceholder: "eg: 12,34,69",
    apiTokenLabel: "Drupal Wiki API Token",
    apiTokenTooltip:
      "You need to provide an API token for authentication. See the Drupal Wiki <a>manual</a> on how to generate an API-Token for your user.",
    apiTokenDescription: "Access token for authentication.",
    apiTokenPlaceholder: "pat:123",
    submitButton: "Submit",
    collectingButton: "Collecting pages...",
    collectingDescription:
      "Once complete, all pages will be available for embedding into workspaces.",
    toastFetching:
      "Fetching all pages for the given Drupal Wiki spaces - this may take a while.",
    toastSuccess:
      "Pages collected from Drupal Wiki spaces {{spaceIds}}. Output folder is {{destination}}.",
  },

  fileUploadWarning: {
    embeddingProgress: "Embedding {{current}} of {{total}} {{fileWord}}",
    pleaseWait: "Please wait while we embed your files...",
    title: "Context Window Warning",
    description:
      "Your workspace is using {{tokenCount}} of {{maxTokens}} available tokens. We recommend keeping usage below {{limit}}% to ensure the best chat experience. Adding {{fileCount}} more {{fileWord}} would exceed this limit. <a>Learn more about context windows \u2192</a>",
    chooseAction: "Choose how you would like to proceed with these uploads.",
    cancel: "Cancel",
    continueAnyway: "Continue Anyway",
    embedFile: "Embed {{fileWord}}",
  },
  providerKeyStatus: {
    section: {
      ariaLabel: "Provider API key status",
      title: "Local providers — API key status",
      subtitle:
        "Fallback active = provider runs with a safe placeholder key (no crash, but no real key set).",
    },
    refresh: {
      ariaLabel: "Reload status",
      button: "Refresh",
    },
    status: {
      keySet: "Key set",
      fallbackActive: "Fallback active",
      notConfigured: "Not configured",
    },
    error: {
      loadFailed: "Status could not be loaded: {{error}}",
    },
    loading: "Loading provider status…",
    empty: "No local providers registered.",
    storagePath: {
      problem:
        "Storage path problem detected: {{path}} (exists: {{exists}}, writable: {{writable}}, hotdir: {{hotdir}}).",
      ok: "ok",
      missing: "missing",
    },
    lastChecked: "Last checked: {{time}}",
  },

  pgVector: {
    connectionString: {
      label: "Postgres Connection String",
      placeholder: "postgresql://username:password@host:port/database",
      tooltip: {
        intro:
          "This is the connection string for the Postgres database in the format of",
        permissions:
          "The user for the database must have the following permissions:",
        perm1: "Read access to the database",
        perm2: "Read access to the database schema",
        perm3: "Create access to the database",
        extension:
          "You must have the pgvector extension installed on the database.",
      },
    },
    tableName: {
      label: "Vector Table Name",
      placeholder: "vector_table",
      tooltip: {
        intro:
          "This is the name of the table in the Postgres database that will store the vectors.",
        default: "By default, the table name is",
        warning:
          "This table must not already exist on the database - it will be created automatically.",
      },
    },
  },

  defaultSystemPrompt: {
    title: "Default System Prompt",
    subtitle:
      "This is the default system prompt that will be used for new workspaces.",
    label: "System Prompt",
    description: {
      part1:
        "A system prompt provides instructions that shape the AI's responses and behavior. This prompt will be automatically applied to all newly created workspaces. To change the system prompt of a",
      specificWorkspace: "specific workspace",
      part2: ", edit the prompt in the",
      workspaceSettings: "workspace settings",
      part3:
        ". To restore the system prompt to our sane default, leave this field empty and save changes.",
    },
    variables: {
      intro: "You can insert",
      linkText: "system prompt variables",
      like: "like:",
      more: "+{{count}} more...",
    },
    placeholder:
      "You are an AI assistant that can answer questions and help with tasks.",
    toast: {
      success: "Default system prompt updated successfully.",
      failure: "Failed to update default system prompt: {{message}}",
    },
  },

  newUserModal: {
    title: "Add user to instance",
    username: {
      label: "Username",
      placeholder: "User's username",
    },
    password: {
      label: "Password",
      placeholder: "User's initial password",
      hint: "Password must be at least 8 characters long",
    },
    bio: {
      label: "Bio",
      placeholder: "User's bio",
    },
    role: {
      label: "Role",
      admin: "Administrator",
    },
    error: "Error: {{error}}",
    afterCreate:
      "After creating a user they will need to login with their initial login to get access.",
    submit: "Add user",
  },

  liteLLM: {
    baseUrl: {
      label: "Base URL",
      placeholder: "http://127.0.0.1:4000",
    },
    maxChunkLength: {
      label: "Max embedding chunk length",
      placeholder: "8192",
      tooltip: "Maximum length of text chunks, in characters, for embedding.",
    },
    apiKey: {
      label: "API Key",
      placeholder: "sk-mysecretkey",
    },
    modelSelection: {
      label: "Embedding Model Selection",
      loadingModels: "-- loading available models --",
      waitingForUrl: "-- waiting for URL --",
      yourLoadedModels: "Your loaded models",
      tooltip: {
        intro:
          "Be sure to select a valid embedding model. Chat models are not embedding models. See",
        linkText: "this page",
        outro: "for more information.",
      },
    },
  },

  kokoro: {
    intro: {
      part1: "Connect to a self-hosted",
      linkText: "kokoro-fastapi",
      part2: "server. The voice list is pulled live from your server.",
    },
    baseUrl: {
      label: "Base URL",
      placeholder: "http://localhost:8880/v1",
      help: "The OpenAI-compatible base URL of your {{service}} server.",
    },
    apiKey: {
      label: "API Key",
      placeholder: "Optional API Key",
      help: "Optional — only required if you front your Kokoro server with auth.",
    },
    voiceModel: {
      label: "Voice Model",
      loading: "-- loading available voices --",
      placeholder: "af_bella",
      unreachable:
        "Could not reach the Kokoro server to load voices. Enter a voice id manually.",
    },
  },

  webScrapingNode: {
    urlLabel: "URL to Scrape",
    urlPlaceholder: "https://example.com",
    captureAsLabel: "Capture Page Content As",
    captureAs: {
      text: "Text content only",
      html: "Raw HTML",
      querySelector: "CSS Query Selector",
    },
    querySelectorLabel: "Query Selector",
    querySelectorHelp:
      "Enter a valid CSS selector to scrape the content of the page.",
    querySelectorPlaceholder: ".article-content, #content, .main-content, etc.",
    contentSummarization: "Content Summarization",
    resultVariable: "Result Variable",
    selectOrCreateVariable: "Select or create variable",
  },

  agentSkill: {
    warning: {
      title: "Only import agent skills you trust",
      body: "Agent skills can execute code on your OpenSIN Chat instance, so only import agent skills from sources you trust. You should also review the code before importing. If you are unsure about what a skill does - don't import it!",
    },
    reviewTitle: 'Review Agent Skill "{{name}}"',
    createdBy: "Created by",
    verified: "Verified code",
    notVerified: "This skill is not verified.",
    learnMore: "Learn more →",
    description: {
      part1:
        "Agent skills unlock new capabilities for your OpenSIN Chat workspace via",
      part2: "skills that can do specific tasks when invoked.",
    },
    fileCounter: "{{name}} ({{current}} of {{total}} files)",
    import: "Import agent skill",
    toast: {
      importSuccess: "Agent skill imported successfully!",
      importFailed: "Failed to import agent skill. {{message}}",
    },
  },
};

export default TRANSLATIONS;
