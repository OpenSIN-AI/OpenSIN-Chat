// SPDX-License-Identifier: MIT
/**
 * Integration-style tests for streamChatWithWorkspace (utils/chats/stream.js).
 *
 * This is the core chat orchestration path: SSE chunk writing, provider
 * resolution, vector search, persistence, and background title generation.
 * The endpoint tests (endpoints/chat.test.js) mock this function away, so
 * without this suite the entire orchestration was untested (Issue #369).
 *
 * writeResponseChunk is used UN-mocked so the real SSE wire format
 * ("data: {json}\n\n") is exercised and parsed back per test.
 */

jest.mock("../../../utils/logger/console.js", () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));
jest.mock("../../../utils/DocumentManager", () => ({
  DocumentManager: jest.fn().mockImplementation(() => ({
    pinnedDocs: jest.fn().mockResolvedValue([]),
    contextModeDocs: jest.fn().mockResolvedValue([]),
    alwaysOnContextDocs: jest.fn().mockResolvedValue([]),
  })),
}));
jest.mock("../../../models/workspaceChats", () => ({
  WorkspaceChats: { new: jest.fn() },
}));
jest.mock("../../../models/workspaceParsedFiles", () => ({
  WorkspaceParsedFiles: { getContextFiles: jest.fn().mockResolvedValue([]) },
}));
jest.mock("../../../models/workspaceThread", () => ({
  WorkspaceThread: {
    defaultName: "New Thread",
    autoRenameThread: jest.fn(),
  },
}));
jest.mock("../../../utils/helpers", () => ({
  getVectorDbClass: jest.fn(),
  resolveProviderConnector: jest.fn(),
}));
jest.mock("../../../utils/helpers/chat", () => ({
  fillSourceWindow: jest.fn(() => ({ contextTexts: [], sources: [] })),
}));
jest.mock("../../../utils/chats/agents", () => ({
  grepAgents: jest.fn().mockResolvedValue(false),
}));
jest.mock("../../../utils/backgroundJobs/queue", () => ({
  add: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../../utils/chats/index", () => ({
  grepCommand: jest.fn(async (message) => message),
  VALID_COMMANDS: {},
  chatPrompt: jest.fn(async () => "SYSTEM PROMPT"),
  recentChatHistory: jest.fn(async () => ({
    rawHistory: [],
    chatHistory: [],
  })),
  sourceIdentifier: jest.fn((doc) => doc?.docpath ?? "source"),
}));
jest.mock("../../../utils/chats/extractImageUrls", () => ({
  extractImageUrls: jest.fn(async () => []),
  buildScreenshotUrlPrompt: jest.fn(() => "SCREENSHOT PROMPT"),
}));

const { WorkspaceChats } = require("../../../models/workspaceChats");
const {
  getVectorDbClass,
  resolveProviderConnector,
} = require("../../../utils/helpers");
const BackgroundQueue = require("../../../utils/backgroundJobs/queue");
const { grepAgents } = require("../../../utils/chats/agents");
const { streamChatWithWorkspace } = require("../../../utils/chats/stream");

const WORKSPACE = {
  id: 1,
  slug: "ws",
  name: "Workspace",
  chatMode: "chat",
  openAiHistory: 20,
};

/**
 * Fake Express response capturing the raw SSE wire format so the tests
 * verify what an actual client would receive.
 */
function createSSEResponse() {
  const listeners = {};
  const res = {
    raw: [],
    writableEnded: false,
    destroyed: false,
    write(data) {
      res.raw.push(data);
      return true;
    },
    on(event, cb) {
      (listeners[event] ||= []).push(cb);
    },
    removeListener(event, cb) {
      listeners[event] = (listeners[event] || []).filter((fn) => fn !== cb);
    },
    emit(event) {
      (listeners[event] || []).forEach((cb) => cb());
    },
    end() {
      res.writableEnded = true;
    },
  };
  res.chunks = () =>
    res.raw
      .filter((c) => typeof c === "string" && c.startsWith("data: "))
      .map((c) => JSON.parse(c.slice("data: ".length)));
  return res;
}

/** Builds a fully-working mock LLM connector. Override members per test. */
function createConnector(overrides = {}) {
  return {
    className: "MockLLM",
    defaultTemp: 0.7,
    promptWindowLimit: () => 8192,
    streamingEnabled: () => true,
    compressMessages: jest.fn(async () => [{ role: "user", content: "hi" }]),
    streamGetChatCompletion: jest.fn(),
    handleStream: jest.fn(),
    getChatCompletion: jest.fn(),
    ...overrides,
  };
}

function createVectorDb(overrides = {}) {
  return {
    hasNamespace: jest.fn(async () => true),
    namespaceCount: jest.fn(async () => 3),
    performSimilaritySearch: jest.fn(async () => ({
      contextTexts: [],
      sources: [],
      message: null,
    })),
    ...overrides,
  };
}

function wireHappyPath({ connector, vectorDb } = {}) {
  const llm = connector ?? createConnector();
  const db = vectorDb ?? createVectorDb();
  getVectorDbClass.mockReturnValue(db);
  resolveProviderConnector.mockResolvedValue({
    connector: llm,
    routingMetadata: null,
    prefetchedContext: null,
  });
  return { llm, db };
}

describe("streamChatWithWorkspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    grepAgents.mockResolvedValue(false);
    WorkspaceChats.new.mockResolvedValue({ chat: { id: 42 } });
  });

  describe("happy path (streaming provider)", () => {
    it("streams, persists the chat, and finalizes with the chatId", async () => {
      const { llm } = wireHappyPath();
      llm.streamGetChatCompletion.mockResolvedValue({ metrics: { tps: 10 } });
      llm.handleStream.mockResolvedValue("Die Antwort ist 42.");

      const res = createSSEResponse();
      await streamChatWithWorkspace(res, WORKSPACE, "Was ist die Antwort?");

      expect(WorkspaceChats.new).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE.id,
          prompt: "Was ist die Antwort?",
          threadId: null,
          response: expect.objectContaining({ text: "Die Antwort ist 42." }),
        }),
      );
      const finalize = res
        .chunks()
        .find((c) => c.type === "finalizeResponseStream");
      expect(finalize).toBeDefined();
      expect(finalize.chatId).toBe(42);
      expect(finalize.error).toBe(false);
    });

    it("persists umlauts, markdown and code blocks losslessly", async () => {
      const tricky =
        'Grüße! Hier ist Code:\n```js\nconst x = "<script>alert(1)</script>";\n```\nÜmläute & Sonderzeichen: äöüß €';
      const { llm } = wireHappyPath();
      llm.streamGetChatCompletion.mockResolvedValue({ metrics: {} });
      llm.handleStream.mockResolvedValue(tricky);

      const res = createSSEResponse();
      await streamChatWithWorkspace(res, WORKSPACE, "code bitte");

      expect(WorkspaceChats.new).toHaveBeenCalledWith(
        expect.objectContaining({
          response: expect.objectContaining({ text: tricky }),
        }),
      );
    });

    it("does not persist and finalizes without chatId when stream yields empty text", async () => {
      const { llm } = wireHappyPath();
      llm.streamGetChatCompletion.mockResolvedValue({ metrics: {} });
      llm.handleStream.mockResolvedValue("");

      const res = createSSEResponse();
      await streamChatWithWorkspace(res, WORKSPACE, "hallo");

      expect(WorkspaceChats.new).not.toHaveBeenCalled();
      const finalize = res
        .chunks()
        .find((c) => c.type === "finalizeResponseStream");
      expect(finalize).toBeDefined();
      expect(finalize.chatId).toBeUndefined();
    });
  });

  describe("provider failure paths", () => {
    it("aborts with a helpful message when the provider returns a null stream (Issue #262)", async () => {
      const { llm } = wireHappyPath();
      llm.streamGetChatCompletion.mockResolvedValue(null);

      const res = createSSEResponse();
      await streamChatWithWorkspace(res, WORKSPACE, "hallo");

      const abort = res.chunks().find((c) => c.type === "abort");
      expect(abort).toBeDefined();
      expect(abort.error).toMatch(/MockLLM/);
      expect(abort.error).toMatch(/provider configuration|API key/i);
      expect(WorkspaceChats.new).not.toHaveBeenCalled();
      expect(llm.handleStream).not.toHaveBeenCalled();
    });

    it("aborts with a router error when provider resolution throws", async () => {
      getVectorDbClass.mockReturnValue(createVectorDb());
      resolveProviderConnector.mockRejectedValue(
        new Error("no provider configured"),
      );

      const res = createSSEResponse();
      await streamChatWithWorkspace(res, WORKSPACE, "hallo");

      const abort = res.chunks().find((c) => c.type === "abort");
      expect(abort).toBeDefined();
      expect(abort.error).toBe("Model router error: no provider configured");
      expect(WorkspaceChats.new).not.toHaveBeenCalled();
    });

    it("propagates mid-stream errors to the caller (endpoint writes 'Internal error')", async () => {
      const { llm } = wireHappyPath();
      llm.streamGetChatCompletion.mockResolvedValue({ metrics: {} });
      llm.handleStream.mockRejectedValue(new Error("socket hang up"));

      const res = createSSEResponse();
      await expect(
        streamChatWithWorkspace(res, WORKSPACE, "hallo"),
      ).rejects.toThrow("socket hang up");
      // A half-written response must never be persisted as chat history.
      expect(WorkspaceChats.new).not.toHaveBeenCalled();
    });

    it("aborts when the vector search itself fails", async () => {
      const vectorDb = createVectorDb({
        performSimilaritySearch: jest.fn(async () => ({
          contextTexts: [],
          sources: [],
          message: "Vector DB unreachable",
        })),
      });
      wireHappyPath({ vectorDb });

      const res = createSSEResponse();
      await streamChatWithWorkspace(res, WORKSPACE, "hallo");

      const abort = res.chunks().find((c) => c.type === "abort");
      expect(abort).toBeDefined();
      expect(abort.error).toBe("Vector DB unreachable");
      expect(WorkspaceChats.new).not.toHaveBeenCalled();
    });
  });

  describe("client disconnect handling", () => {
    it("skips the LLM call entirely when the client disconnected during prep work", async () => {
      const { llm } = wireHappyPath();

      const res = createSSEResponse();
      // Simulate disconnect after prep started but before the LLM call:
      // compressMessages is the last prep step, so flip the flag there.
      llm.compressMessages.mockImplementation(async () => {
        res.writableEnded = true;
        return [];
      });

      await streamChatWithWorkspace(res, WORKSPACE, "hallo");

      expect(llm.streamGetChatCompletion).not.toHaveBeenCalled();
      expect(llm.getChatCompletion).not.toHaveBeenCalled();
      expect(WorkspaceChats.new).not.toHaveBeenCalled();
    });

    it("does not write a response when the client disconnects during a non-streaming completion", async () => {
      const llm = createConnector({ streamingEnabled: () => false });
      wireHappyPath({ connector: llm });

      const res = createSSEResponse();
      llm.getChatCompletion.mockImplementation(async () => {
        res.emit("close"); // client disconnects mid-completion
        return { textResponse: "too late", metrics: {} };
      });

      await streamChatWithWorkspace(res, WORKSPACE, "hallo");

      // Only the initial requestContext chunk should be present; no response content.
      const responseChunks = res.chunks().filter((c) => c.type !== "requestContext");
      expect(responseChunks).toHaveLength(0);
      expect(WorkspaceChats.new).not.toHaveBeenCalled();
    });
  });

  describe("query mode refusals", () => {
    it("refuses and persists (include:false) when the workspace has no embeddings", async () => {
      const vectorDb = createVectorDb({
        hasNamespace: jest.fn(async () => false),
        namespaceCount: jest.fn(async () => 0),
      });
      const { llm } = wireHappyPath({ vectorDb });

      const res = createSSEResponse();
      await streamChatWithWorkspace(res, WORKSPACE, "frage?", "query");

      const text = res.chunks().find((c) => c.type === "textResponse");
      expect(text).toBeDefined();
      expect(text.textResponse).toMatch(/no relevant information/i);
      expect(WorkspaceChats.new).toHaveBeenCalledWith(
        expect.objectContaining({ include: false }),
      );
      expect(llm.streamGetChatCompletion).not.toHaveBeenCalled();
    });

    it("uses the workspace's custom refusal response when configured", async () => {
      const vectorDb = createVectorDb({
        hasNamespace: jest.fn(async () => false),
        namespaceCount: jest.fn(async () => 0),
      });
      wireHappyPath({ vectorDb });

      const res = createSSEResponse();
      await streamChatWithWorkspace(
        res,
        { ...WORKSPACE, queryRefusalResponse: "Keine Daten vorhanden." },
        "frage?",
        "query",
      );

      const text = res.chunks().find((c) => c.type === "textResponse");
      expect(text.textResponse).toBe("Keine Daten vorhanden.");
    });

    it("refuses when query mode finds no context chunks at all", async () => {
      // Workspace HAS embeddings but the search returns nothing usable.
      const { llm } = wireHappyPath();

      const res = createSSEResponse();
      await streamChatWithWorkspace(res, WORKSPACE, "frage?", "query");

      const text = res.chunks().find((c) => c.type === "textResponse");
      expect(text).toBeDefined();
      expect(text.textResponse).toMatch(/no relevant information/i);
      expect(WorkspaceChats.new).toHaveBeenCalledWith(
        expect.objectContaining({ include: false }),
      );
      expect(llm.streamGetChatCompletion).not.toHaveBeenCalled();
    });
  });

  describe("thread title background job", () => {
    it("enqueues GENERATE_THREAD_TITLE only for threads still using the default name", async () => {
      const { llm } = wireHappyPath();
      llm.streamGetChatCompletion.mockResolvedValue({ metrics: {} });
      llm.handleStream.mockResolvedValue("Antwort");

      const res = createSSEResponse();
      const defaultThread = { id: 7, slug: "t7", name: "New Thread" };
      await streamChatWithWorkspace(
        res,
        WORKSPACE,
        "hallo",
        "chat",
        null,
        defaultThread,
      );

      expect(BackgroundQueue.add).toHaveBeenCalledWith(
        "GENERATE_THREAD_TITLE",
        expect.objectContaining({ threadId: 7, workspaceSlug: WORKSPACE.slug }),
      );
    });

    it("does not enqueue a title job for already-renamed threads", async () => {
      const { llm } = wireHappyPath();
      llm.streamGetChatCompletion.mockResolvedValue({ metrics: {} });
      llm.handleStream.mockResolvedValue("Antwort");

      const res = createSSEResponse();
      const namedThread = { id: 8, slug: "t8", name: "Mein Thema" };
      await streamChatWithWorkspace(
        res,
        WORKSPACE,
        "hallo",
        "chat",
        null,
        namedThread,
      );

      expect(BackgroundQueue.add).not.toHaveBeenCalled();
      // But the chat itself is persisted against the thread.
      expect(WorkspaceChats.new).toHaveBeenCalledWith(
        expect.objectContaining({ threadId: 8 }),
      );
    });

    it("survives a failing queue insert without breaking the chat response", async () => {
      const { llm } = wireHappyPath();
      llm.streamGetChatCompletion.mockResolvedValue({ metrics: {} });
      llm.handleStream.mockResolvedValue("Antwort");
      BackgroundQueue.add.mockRejectedValue(new Error("queue db locked"));

      const res = createSSEResponse();
      const defaultThread = { id: 9, slug: "t9", name: "New Thread" };
      await streamChatWithWorkspace(
        res,
        WORKSPACE,
        "hallo",
        "chat",
        null,
        defaultThread,
      );

      const finalize = res
        .chunks()
        .find((c) => c.type === "finalizeResponseStream");
      expect(finalize).toBeDefined();
      expect(finalize.chatId).toBe(42);
    });
  });

  describe("agent chats", () => {
    it("exits early when the message is handled by the agent flow", async () => {
      const { llm } = wireHappyPath();
      grepAgents.mockResolvedValue(true);

      const res = createSSEResponse();
      await streamChatWithWorkspace(res, WORKSPACE, "@agent do things");

      expect(llm.streamGetChatCompletion).not.toHaveBeenCalled();
      expect(WorkspaceChats.new).not.toHaveBeenCalled();
    });
  });

  describe("model routing notifications", () => {
    it("emits a modelRouteNotification chunk when routing wants to notify", async () => {
      const llm = createConnector();
      llm.streamGetChatCompletion.mockResolvedValue({ metrics: {} });
      llm.handleStream.mockResolvedValue("Antwort");
      getVectorDbClass.mockReturnValue(createVectorDb());
      resolveProviderConnector.mockResolvedValue({
        connector: llm,
        routingMetadata: {
          routedTo: { shouldNotify: true, provider: "openai", model: "gpt-x" },
        },
        prefetchedContext: null,
      });

      const res = createSSEResponse();
      await streamChatWithWorkspace(res, WORKSPACE, "hallo");

      const note = res
        .chunks()
        .find((c) => c.type === "modelRouteNotification");
      expect(note).toBeDefined();
      expect(note.routedTo.model).toBe("gpt-x");
    });
  });
});
