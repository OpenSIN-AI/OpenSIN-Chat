// SPDX-License-Identifier: MIT
/* eslint-env jest */
process.env.NODE_ENV = "test";

jest.mock("../../../models/workspaceChats", () => ({
  WorkspaceChats: { new: jest.fn().mockResolvedValue({ id: 1 }) },
}));

jest.mock("../../../utils/helpers", () => ({
  getVectorDbClass: jest.fn(),
  resolveProviderConnector: jest.fn(),
}));

jest.mock("../../../utils/DocumentManager", () => ({
  DocumentManager: jest.fn().mockImplementation(() => ({
    pinnedDocs: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock("../../../utils/chats", () => ({
  sourceIdentifier: jest.fn((doc) => doc?.id || "doc-id"),
  recentChatHistory: jest.fn().mockResolvedValue({
    rawHistory: [],
    chatHistory: [],
  }),
  chatPrompt: jest.fn().mockResolvedValue("system prompt"),
}));

jest.mock("../../../utils/helpers/chat", () => ({
  fillSourceWindow: jest.fn().mockReturnValue({
    contextTexts: [],
    sources: [],
  }),
}));

jest.mock("../../../utils/agents", () => ({
  AgentHandler: {
    isAgentInvocation: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock("../../../utils/telegramBot/constants", () => ({
  STREAM_EDIT_INTERVAL: 5000,
  MAX_MSG_LEN: 4096,
  CURSOR_CHAR: "▌",
}));

jest.mock("../../../utils/telegramBot/utils", () => ({
  editMessage: jest.fn().mockResolvedValue({}),
  sendFormattedMessage: jest.fn().mockResolvedValue({}),
}));

jest.mock("../../../utils/telegramBot/utils/media", () => ({
  sendVoiceResponse: jest.fn().mockResolvedValue({}),
}));

jest.mock("../../../utils/http", () => ({
  safeJsonParse: jest.fn((v, fb) => {
    try { return JSON.parse(v); } catch { return fb; }
  }),
}));

jest.mock("../../../utils/telegramBot/chat/agent", () => ({
  handleAgentResponse: jest.fn().mockResolvedValue("agent-response"),
}));

const { streamResponse } = require("../../../utils/telegramBot/chat/stream");
const { handleAgentResponse } = require("../../../utils/telegramBot/chat/agent");
const { AgentHandler } = require("../../../utils/agents");
const { recentChatHistory } = require("../../../utils/chats");
const { resolveProviderConnector, getVectorDbClass } = require("../../../utils/helpers");
const { WorkspaceChats } = require("../../../models/workspaceChats");
const { sendFormattedMessage } = require("../../../utils/telegramBot/utils");
const { sendVoiceResponse } = require("../../../utils/telegramBot/utils/media");

function makeCtx() {
  return {
    bot: {
      sendChatAction: jest.fn().mockResolvedValue({}),
      sendMessage: jest.fn().mockResolvedValue({ message_id: 42 }),
    },
    log: { info: jest.fn() },
  };
}

function makeWorkspace(chatMode = "chat") {
  return {
    id: 1,
    slug: "test-ws",
    chatMode,
    openAiHistory: 20,
    openAiTemp: 0.7,
    similarityThreshold: 0.5,
    topN: 4,
  };
}

function setupNormalFlowMocks() {
  const mockConnector = {
    promptWindowLimit: jest.fn().mockReturnValue(4096),
    streamingEnabled: jest.fn().mockReturnValue(false),
    getChatCompletion: jest.fn().mockResolvedValue({
      textResponse: "Hello world",
      metrics: { tokens: 10 },
    }),
    compressMessages: jest.fn().mockResolvedValue([{ role: "user", content: "hi" }]),
    defaultTemp: 0.5,
  };

  resolveProviderConnector.mockResolvedValue({ connector: mockConnector });

  const MockVectorDb = jest.fn().mockImplementation(() => ({}));
  MockVectorDb.namespaceCount = jest.fn().mockResolvedValue(0);
  MockVectorDb.performSimilaritySearch = jest.fn().mockResolvedValue({
    contextTexts: [],
    sources: [],
    message: null,
  });
  getVectorDbClass.mockReturnValue(MockVectorDb);

  return mockConnector;
}

describe("historyIsAgentic (via streamResponse branching)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AgentHandler.isAgentInvocation.mockResolvedValue(false);
  });

  it("returns false for non-chat mode — query", async () => {
    const ctx = makeCtx();
    const workspace = makeWorkspace("query");
    recentChatHistory.mockResolvedValue({
      rawHistory: [],
      chatHistory: [
        { role: "user", content: "@agent do something" },
      ],
    });
    setupNormalFlowMocks();

    await streamResponse({ ctx, chatId: 123, workspace, message: "hello" });

    expect(handleAgentResponse).not.toHaveBeenCalled();
  });

  it("returns false for non-chat mode — automatic", async () => {
    const ctx = makeCtx();
    const workspace = makeWorkspace("automatic");
    recentChatHistory.mockResolvedValue({
      rawHistory: [],
      chatHistory: [
        { role: "user", content: "@agent do something" },
      ],
    });
    setupNormalFlowMocks();

    await streamResponse({ ctx, chatId: 123, workspace, message: "hello" });

    expect(handleAgentResponse).not.toHaveBeenCalled();
  });

  it("returns false for chat mode with no @agent messages", async () => {
    const ctx = makeCtx();
    const workspace = makeWorkspace("chat");
    recentChatHistory.mockResolvedValue({
      rawHistory: [],
      chatHistory: [
        { role: "user", content: "just a normal question" },
        { role: "assistant", content: "here is the answer" },
      ],
    });
    setupNormalFlowMocks();

    await streamResponse({ ctx, chatId: 123, workspace, message: "hello" });

    expect(handleAgentResponse).not.toHaveBeenCalled();
  });

  it("returns true for chat mode with @agent messages", async () => {
    const ctx = makeCtx();
    const workspace = makeWorkspace("chat");
    recentChatHistory.mockResolvedValue({
      rawHistory: [],
      chatHistory: [
        { role: "user", content: "@agent analyze this" },
        { role: "assistant", content: "done" },
      ],
    });

    await streamResponse({ ctx, chatId: 123, workspace, message: "hello" });

    expect(handleAgentResponse).toHaveBeenCalledWith(
      ctx, 123, workspace, null, "hello", false, [],
    );
  });

  it("only checks user messages, not assistant messages", async () => {
    const ctx = makeCtx();
    const workspace = makeWorkspace("chat");
    recentChatHistory.mockResolvedValue({
      rawHistory: [],
      chatHistory: [
        { role: "assistant", content: "@agent this is from assistant" },
        { role: "user", content: "normal user message" },
      ],
    });
    setupNormalFlowMocks();

    await streamResponse({ ctx, chatId: 123, workspace, message: "hello" });

    expect(handleAgentResponse).not.toHaveBeenCalled();
  });

  it("returns false for empty history in chat mode", async () => {
    const ctx = makeCtx();
    const workspace = makeWorkspace("chat");
    recentChatHistory.mockResolvedValue({
      rawHistory: [],
      chatHistory: [],
    });
    setupNormalFlowMocks();

    await streamResponse({ ctx, chatId: 123, workspace, message: "hello" });

    expect(handleAgentResponse).not.toHaveBeenCalled();
  });

  it("handles multiple messages correctly — mixed with @agent", async () => {
    const ctx = makeCtx();
    const workspace = makeWorkspace("chat");
    recentChatHistory.mockResolvedValue({
      rawHistory: [],
      chatHistory: [
        { role: "user", content: "first message" },
        { role: "assistant", content: "reply" },
        { role: "user", content: "@agent do something" },
        { role: "assistant", content: "agent reply" },
      ],
    });

    await streamResponse({ ctx, chatId: 123, workspace, message: "follow-up" });

    expect(handleAgentResponse).toHaveBeenCalledWith(
      ctx, 123, workspace, null, "follow-up", false, [],
    );
  });

  it("handles multiple messages correctly — no @agent in any user message", async () => {
    const ctx = makeCtx();
    const workspace = makeWorkspace("chat");
    recentChatHistory.mockResolvedValue({
      rawHistory: [],
      chatHistory: [
        { role: "user", content: "question one" },
        { role: "assistant", content: "answer one" },
        { role: "user", content: "question two" },
        { role: "assistant", content: "@agent in assistant only" },
      ],
    });
    setupNormalFlowMocks();

    await streamResponse({ ctx, chatId: 123, workspace, message: "hello" });

    expect(handleAgentResponse).not.toHaveBeenCalled();
  });
});

describe("streamResponse — parameter validation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws when ctx is missing bot", async () => {
    await expect(
      streamResponse({ ctx: {}, chatId: 1, workspace: makeWorkspace(), message: "hi" }),
    ).rejects.toThrow("Invalid context or missing required parameters");
  });

  it("throws when chatId is missing", async () => {
    await expect(
      streamResponse({ ctx: makeCtx(), chatId: null, workspace: makeWorkspace(), message: "hi" }),
    ).rejects.toThrow("Invalid context or missing required parameters");
  });

  it("throws when workspace is missing", async () => {
    await expect(
      streamResponse({ ctx: makeCtx(), chatId: 1, workspace: null, message: "hi" }),
    ).rejects.toThrow("Invalid context or missing required parameters");
  });

  it("throws when message is empty", async () => {
    await expect(
      streamResponse({ ctx: makeCtx(), chatId: 1, workspace: makeWorkspace(), message: "" }),
    ).rejects.toThrow("Invalid context or missing required parameters");
  });
});

describe("streamResponse — agent invocation via AgentHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recentChatHistory.mockResolvedValue({
      rawHistory: [],
      chatHistory: [],
    });
  });

  it("delegates to handleAgentResponse when AgentHandler.isAgentInvocation is true", async () => {
    const ctx = makeCtx();
    const workspace = makeWorkspace("automatic");
    AgentHandler.isAgentInvocation.mockResolvedValue(true);

    await streamResponse({ ctx, chatId: 123, workspace, message: "@agent hello" });

    expect(AgentHandler.isAgentInvocation).toHaveBeenCalledWith({
      message: "@agent hello",
      workspace,
      chatMode: "automatic",
    });
    expect(handleAgentResponse).toHaveBeenCalled();
  });

  it("prefers historyIsAgentic over AgentHandler when both could match", async () => {
    const ctx = makeCtx();
    const workspace = makeWorkspace("chat");
    recentChatHistory.mockResolvedValue({
      rawHistory: [],
      chatHistory: [{ role: "user", content: "@agent previous" }],
    });
    AgentHandler.isAgentInvocation.mockResolvedValue(true);

    await streamResponse({ ctx, chatId: 123, workspace, message: "follow-up" });

    expect(handleAgentResponse).toHaveBeenCalledTimes(1);
  });
});

describe("streamResponse — normal RAG flow", () => {
  let mockConnector;

  beforeEach(() => {
    jest.clearAllMocks();
    AgentHandler.isAgentInvocation.mockResolvedValue(false);
    recentChatHistory.mockResolvedValue({
      rawHistory: [],
      chatHistory: [],
    });
    mockConnector = setupNormalFlowMocks();
  });

  it("sends typing action at the start", async () => {
    const ctx = makeCtx();

    await streamResponse({ ctx, chatId: 123, workspace: makeWorkspace(), message: "hi" });

    expect(ctx.bot.sendChatAction).toHaveBeenCalledWith(123, "typing");
  });

  it("calls resolveProviderConnector with correct args", async () => {
    const ctx = makeCtx();
    const ws = makeWorkspace();

    await streamResponse({ ctx, chatId: 123, workspace: ws, message: "hi", thread: { id: 5 }, attachments: ["a"] });

    expect(resolveProviderConnector).toHaveBeenCalledWith({
      workspace: ws,
      prompt: "hi",
      thread: { id: 5 },
      attachments: ["a"],
    });
  });

  it("persists chat and sends message via non-streaming path", async () => {
    const ctx = makeCtx();
    const ws = makeWorkspace();

    await streamResponse({ ctx, chatId: 123, workspace: ws, message: "hi" });

    expect(WorkspaceChats.new).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: ws.id,
        prompt: "hi",
      }),
    );
    expect(sendFormattedMessage).toHaveBeenCalledWith(ctx.bot, 123, "Hello world");
  });

  it("sends voice response when voiceResponse is true", async () => {
    const ctx = makeCtx();
    const ws = makeWorkspace();

    await streamResponse({ ctx, chatId: 123, workspace: ws, message: "hi", voiceResponse: true });

    expect(sendVoiceResponse).toHaveBeenCalledWith(ctx.bot, 123, "Hello world");
  });

  it("does not send voice response when voiceResponse is false", async () => {
    const ctx = makeCtx();
    const ws = makeWorkspace();

    await streamResponse({ ctx, chatId: 123, workspace: ws, message: "hi", voiceResponse: false });

    expect(sendVoiceResponse).not.toHaveBeenCalled();
  });

  it("sends error message when no response text is generated", async () => {
    const ctx = makeCtx();
    const ws = makeWorkspace();
    mockConnector.getChatCompletion.mockResolvedValue({
      textResponse: "",
      metrics: {},
    });

    await streamResponse({ ctx, chatId: 123, workspace: ws, message: "hi" });

    expect(ctx.bot.sendMessage).toHaveBeenCalledWith(123, "No response generated.");
    expect(WorkspaceChats.new).not.toHaveBeenCalled();
  });
});

describe("streamResponse — streaming path", () => {
  let mockConnector;

  beforeEach(() => {
    jest.clearAllMocks();
    AgentHandler.isAgentInvocation.mockResolvedValue(false);
    recentChatHistory.mockResolvedValue({
      rawHistory: [],
      chatHistory: [],
    });

    mockConnector = {
      promptWindowLimit: jest.fn().mockReturnValue(4096),
      streamingEnabled: jest.fn().mockReturnValue(true),
      streamGetChatCompletion: jest.fn().mockResolvedValue({ metrics: { tokens: 20 } }),
      handleStream: jest.fn().mockResolvedValue("streamed response text"),
      compressMessages: jest.fn().mockResolvedValue([{ role: "user", content: "hi" }]),
      defaultTemp: 0.5,
    };

    resolveProviderConnector.mockResolvedValue({ connector: mockConnector });

    const MockVectorDb = jest.fn().mockImplementation(() => ({}));
    MockVectorDb.namespaceCount = jest.fn().mockResolvedValue(0);
    getVectorDbClass.mockReturnValue(MockVectorDb);
  });

  it("uses streaming when LLMConnector.streamingEnabled returns true", async () => {
    const ctx = makeCtx();
    const ws = makeWorkspace();

    await streamResponse({ ctx, chatId: 123, workspace: ws, message: "hi" });

    expect(mockConnector.streamGetChatCompletion).toHaveBeenCalled();
    expect(mockConnector.handleStream).toHaveBeenCalled();
  });

  it("persists streamed response text", async () => {
    const ctx = makeCtx();
    const ws = makeWorkspace();

    await streamResponse({ ctx, chatId: 123, workspace: ws, message: "hi" });

    expect(WorkspaceChats.new).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "hi",
        response: expect.objectContaining({ text: "streamed response text" }),
      }),
    );
  });
});

describe("streamResponse — search error handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AgentHandler.isAgentInvocation.mockResolvedValue(false);
    recentChatHistory.mockResolvedValue({
      rawHistory: [],
      chatHistory: [],
    });
  });

  it("sends error message when vector search fails", async () => {
    const ctx = makeCtx();
    const ws = makeWorkspace();
    const mockConnector = {
      promptWindowLimit: jest.fn().mockReturnValue(4096),
      streamingEnabled: jest.fn().mockReturnValue(false),
      getChatCompletion: jest.fn().mockResolvedValue({ textResponse: "ok", metrics: {} }),
      compressMessages: jest.fn().mockResolvedValue([]),
      defaultTemp: 0.5,
    };

    resolveProviderConnector.mockResolvedValue({ connector: mockConnector });

    const MockVectorDb = jest.fn().mockImplementation(() => ({}));
    MockVectorDb.namespaceCount = jest.fn().mockResolvedValue(5);
    MockVectorDb.performSimilaritySearch = jest.fn().mockResolvedValue({
      contextTexts: [],
      sources: [],
      message: "search failed",
    });
    getVectorDbClass.mockReturnValue(MockVectorDb);

    await streamResponse({ ctx, chatId: 123, workspace: ws, message: "hi" });

    expect(ctx.bot.sendMessage).toHaveBeenCalledWith(123, "Vector search failed. Please try again.");
    expect(mockConnector.getChatCompletion).not.toHaveBeenCalled();
  });
});
