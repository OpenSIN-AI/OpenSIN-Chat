// SPDX-License-Identifier: MIT
/* eslint-env jest */

const chatHistoryModule = require("../../../../../utils/agents/aibitat/plugins/chat-history.js");
const { chatHistory } = chatHistoryModule;
const { WorkspaceChats } = require("../../../../../models/workspaceChats");
const { WorkspaceThread } = require("../../../../../models/workspaceThread");
const { Workspace } = require("../../../../../models/workspace");

function buildAibitat(overrides = {}) {
  const listeners = { message: [] };
  const aibitat = {
    _chats: [],
    chats: [],
    _aborted: false,
    trackedChatId: null,
    _pendingCitations: [],
    _pendingOutputs: [],
    _pendingClarifyingQuestionSurveys: [],
    _replySpecialAttributes: undefined,
    _threadRenamed: false,
    handlerProps: {
      invocation: {
        workspace_id: 1,
        user_id: 42,
        thread_id: null,
      },
      log: jest.fn(),
    },
    providerInstance: null,
    socket: null,
    onMessage: (fn) => {
      listeners.message.push(fn);
    },
    onAbort: (fn) => {
      listeners.abort = fn;
    },
    introspect: jest.fn(),
    registerChatId: jest.fn((id) => {
      aibitat.trackedChatId = id;
    }),
    clearCitations: jest.fn(),
    clearClarifyingQuestionSurveys: jest.fn(),
    clearTrackedChatId: jest.fn(() => {
      aibitat.trackedChatId = null;
    }),
    addCitation: jest.fn(),
    hasOwnProperty: Object.prototype.hasOwnProperty,
    ...overrides,
  };
  aibitat._listeners = listeners;
  // helper to fire all message listeners
  aibitat._fireMessage = async (msg) => {
    for (const fn of listeners.message) await fn(msg);
  };
  return aibitat;
}

function getPlugin() {
  return chatHistory.plugin.call({ name: chatHistory.name });
}

describe("chat-history plugin — registration", () => {
  test("exports chatHistory with expected name", () => {
    expect(chatHistory.name).toBe("chat-history");
  });

  test("startupConfig is defined and has empty params", () => {
    expect(chatHistory.startupConfig).toBeDefined();
    expect(chatHistory.startupConfig.params).toEqual({});
  });

  test("plugin() returns an object with a setup function and a name", () => {
    const plugin = getPlugin();
    expect(plugin.name).toBe("chat-history");
    expect(typeof plugin.setup).toBe("function");
  });

  test("plugin() exposes _store, _storeSpecial, _autoRenameThread, _cleanup", () => {
    const plugin = getPlugin();
    expect(typeof plugin._store).toBe("function");
    expect(typeof plugin._storeSpecial).toBe("function");
    expect(typeof plugin._autoRenameThread).toBe("function");
    expect(typeof plugin._cleanup).toBe("function");
  });
});

describe("chat-history plugin — onAbort wiring", () => {
  test("setup registers an abort listener that flips _aborted to true", () => {
    const aibitat = buildAibitat();
    const plugin = getPlugin();
    plugin.setup(aibitat);
    expect(aibitat._aborted).toBe(false);
    aibitat._listeners.abort();
    expect(aibitat._aborted).toBe(true);
  });
});

describe("chat-history plugin — onMessage new chat creation", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("skips non-USER messages", async () => {
    const newSpy = jest
      .spyOn(WorkspaceChats, "new")
      .mockResolvedValue({ chat: { id: 1 }, message: null });
    const aibitat = buildAibitat();
    const plugin = getPlugin();
    plugin.setup(aibitat);
    await aibitat._fireMessage({ from: "SYSTEM", content: "hi" });
    expect(newSpy).not.toHaveBeenCalled();
  });

  test("creates a new chat when trackedChatId is missing", async () => {
    const newSpy = jest
      .spyOn(WorkspaceChats, "new")
      .mockResolvedValue({ chat: { id: 7 }, message: null });
    const aibitat = buildAibitat();
    const plugin = getPlugin();
    plugin.setup(aibitat);
    await aibitat._fireMessage({ from: "USER", content: "Hello" });
    expect(newSpy).toHaveBeenCalledTimes(1);
    expect(aibitat.registerChatId).toHaveBeenCalledWith(7);
  });

  test("does not create a chat when trackedChatId is already set", async () => {
    const newSpy = jest
      .spyOn(WorkspaceChats, "new")
      .mockResolvedValue({ chat: null, message: null });
    const aibitat = buildAibitat({ trackedChatId: 99 });
    const plugin = getPlugin();
    plugin.setup(aibitat);
    await aibitat._fireMessage({ from: "USER", content: "Hello" });
    expect(newSpy).not.toHaveBeenCalled();
  });

  test("on @agent: regenerate uses last non-agent user message as prompt", async () => {
    const newSpy = jest
      .spyOn(WorkspaceChats, "new")
      .mockResolvedValue({ chat: { id: 5 }, message: null });
    const aibitat = buildAibitat();
    aibitat._chats = [
      { from: "USER", content: "original prompt" },
      { from: "ASSISTANT", content: "old answer" },
      { from: "USER", content: "@agent: try again" },
    ];
    const plugin = getPlugin();
    plugin.setup(aibitat);
    await aibitat._fireMessage({ from: "USER", content: "@agent: try again" });
    expect(newSpy).toHaveBeenCalledTimes(1);
    const callArgs = newSpy.mock.calls[0][0];
    expect(callArgs.prompt).toBe("original prompt");
    // _chats pruned to before the matched user message
    expect(aibitat._chats).toEqual([
      { from: "USER", content: "original prompt" },
    ]);
  });

  test("on @agent: regenerate with no prior user msg uses the @agent: content", async () => {
    const newSpy = jest
      .spyOn(WorkspaceChats, "new")
      .mockResolvedValue({ chat: { id: 6 }, message: null });
    const aibitat = buildAibitat();
    const plugin = getPlugin();
    plugin.setup(aibitat);
    await aibitat._fireMessage({ from: "USER", content: "@agent: hello" });
    expect(newSpy).toHaveBeenCalledTimes(1);
    expect(newSpy.mock.calls[0][0].prompt).toBe("@agent: hello");
  });

  test("does not call registerChatId when chat creation returns null", async () => {
    jest.spyOn(WorkspaceChats, "new").mockResolvedValue({ chat: null, message: "err" });
    const aibitat = buildAibitat();
    const plugin = getPlugin();
    plugin.setup(aibitat);
    await aibitat._fireMessage({ from: "USER", content: "hi" });
    expect(aibitat.registerChatId).not.toHaveBeenCalled();
  });
});

describe("chat-history plugin — onMessage save trigger", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("does nothing when _aborted is true", async () => {
    const upsertSpy = jest.spyOn(WorkspaceChats, "upsert").mockResolvedValue({});
    const aibitat = buildAibitat();
    const plugin = getPlugin();
    plugin.setup(aibitat);
    aibitat._aborted = true;
    aibitat.chats = [
      { from: "USER", content: "hi" },
      { from: "ASSISTANT", content: "hello" },
    ];
    await aibitat._fireMessage({ from: "ASSISTANT", content: "hello" });
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  test("does nothing when lastResponses length is not 2", async () => {
    const upsertSpy = jest.spyOn(WorkspaceChats, "upsert").mockResolvedValue({});
    const aibitat = buildAibitat();
    const plugin = getPlugin();
    plugin.setup(aibitat);
    aibitat.chats = [{ from: "USER", content: "hi" }];
    await aibitat._fireMessage({ from: "USER", content: "hi" });
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  test("does nothing when prev is not from USER", async () => {
    const upsertSpy = jest.spyOn(WorkspaceChats, "upsert").mockResolvedValue({});
    const aibitat = buildAibitat();
    const plugin = getPlugin();
    plugin.setup(aibitat);
    aibitat.chats = [
      { from: "ASSISTANT", content: "x" },
      { from: "ASSISTANT", content: "y" },
    ];
    await aibitat._fireMessage({ from: "ASSISTANT", content: "y" });
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  test("does nothing when last message is from USER", async () => {
    const upsertSpy = jest.spyOn(WorkspaceChats, "upsert").mockResolvedValue({});
    const aibitat = buildAibitat();
    const plugin = getPlugin();
    plugin.setup(aibitat);
    aibitat.chats = [
      { from: "USER", content: "a" },
      { from: "USER", content: "b" },
    ];
    await aibitat._fireMessage({ from: "USER", content: "b" });
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  test("calls _store on USER → ASSISTANT pair", async () => {
    const upsertSpy = jest.spyOn(WorkspaceChats, "upsert").mockResolvedValue({});
    jest.spyOn(WorkspaceThread, "autoRenameThread").mockResolvedValue({});
    const aibitat = buildAibitat({ trackedChatId: 1 });
    const plugin = getPlugin();
    plugin.setup(aibitat);
    aibitat.chats = [
      { from: "USER", content: "ask" },
      { from: "ASSISTANT", content: "answer" },
    ];
    await aibitat._fireMessage({ from: "ASSISTANT", content: "answer" });
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const [id, payload] = upsertSpy.mock.calls[0];
    expect(id).toBe(1);
    expect(payload.prompt).toBe("ask");
    expect(payload.response.text).toBe("answer");
    expect(payload.response.type).toBe("chat");
  });

  test("calls _storeSpecial when _replySpecialAttributes is present", async () => {
    const upsertSpy = jest.spyOn(WorkspaceChats, "upsert").mockResolvedValue({});
    const aibitat = buildAibitat({ trackedChatId: 1 });
    aibitat._replySpecialAttributes = {
      saveAsType: "thread",
      storedResponse: (r) => `SAVED: ${r}`,
      postSave: jest.fn(),
    };
    const plugin = getPlugin();
    plugin.setup(aibitat);
    aibitat.chats = [
      { from: "USER", content: "ask" },
      { from: "ASSISTANT", content: "answer" },
    ];
    await aibitat._fireMessage({ from: "ASSISTANT", content: "answer" });
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const [, payload] = upsertSpy.mock.calls[0];
    expect(payload.response.text).toBe("SAVED: answer");
    expect(payload.response.type).toBe("thread");
    expect(aibitat._replySpecialAttributes).toBeUndefined();
  });

  test("passes attachments through from user message", async () => {
    const upsertSpy = jest.spyOn(WorkspaceChats, "upsert").mockResolvedValue({});
    const aibitat = buildAibitat({ trackedChatId: 1 });
    const plugin = getPlugin();
    plugin.setup(aibitat);
    aibitat.chats = [
      { from: "USER", content: "ask", attachments: [{ id: "a1" }] },
      { from: "ASSISTANT", content: "answer" },
    ];
    await aibitat._fireMessage({ from: "ASSISTANT", content: "answer" });
    const [, payload] = upsertSpy.mock.calls[0];
    expect(payload.response.attachments).toEqual([{ id: "a1" }]);
  });

  test("passes citations, outputs, and clarifyingQuestions through", async () => {
    const upsertSpy = jest.spyOn(WorkspaceChats, "upsert").mockResolvedValue({});
    const aibitat = buildAibitat({ trackedChatId: 1 });
    aibitat._pendingCitations = [{ id: "c1" }];
    aibitat._pendingOutputs = [{ type: "X", payload: {} }];
    aibitat._pendingClarifyingQuestionSurveys = [{ q: "y/n" }];
    const plugin = getPlugin();
    plugin.setup(aibitat);
    aibitat.chats = [
      { from: "USER", content: "q" },
      { from: "ASSISTANT", content: "a" },
    ];
    await aibitat._fireMessage({ from: "ASSISTANT", content: "a" });
    const [, payload] = upsertSpy.mock.calls[0];
    expect(payload.response.sources).toEqual([{ id: "c1" }]);
    expect(payload.response.outputs).toEqual([{ type: "X", payload: {} }]);
    expect(payload.response.clarifyingQuestions).toEqual([{ q: "y/n" }]);
  });

  test("does not include outputs/clarifyingQuestions when arrays are empty", async () => {
    const upsertSpy = jest.spyOn(WorkspaceChats, "upsert").mockResolvedValue({});
    const aibitat = buildAibitat({ trackedChatId: 1 });
    const plugin = getPlugin();
    plugin.setup(aibitat);
    aibitat.chats = [
      { from: "USER", content: "q" },
      { from: "ASSISTANT", content: "a" },
    ];
    await aibitat._fireMessage({ from: "ASSISTANT", content: "a" });
    const [, payload] = upsertSpy.mock.calls[0];
    expect(payload.response.outputs).toBeUndefined();
    expect(payload.response.clarifyingQuestions).toBeUndefined();
  });

  test("passes provider metrics when providerInstance.getUsage exists", async () => {
    const upsertSpy = jest.spyOn(WorkspaceChats, "upsert").mockResolvedValue({});
    const aibitat = buildAibitat({ trackedChatId: 1 });
    aibitat.providerInstance = { getUsage: () => ({ prompt_tokens: 5 }) };
    const plugin = getPlugin();
    plugin.setup(aibitat);
    aibitat.chats = [
      { from: "USER", content: "q" },
      { from: "ASSISTANT", content: "a" },
    ];
    await aibitat._fireMessage({ from: "ASSISTANT", content: "a" });
    const [, payload] = upsertSpy.mock.calls[0];
    expect(payload.response.metrics).toEqual({ prompt_tokens: 5 });
  });

  test("defaults metrics to {} when providerInstance is null", async () => {
    const upsertSpy = jest.spyOn(WorkspaceChats, "upsert").mockResolvedValue({});
    const aibitat = buildAibitat({ trackedChatId: 1 });
    const plugin = getPlugin();
    plugin.setup(aibitat);
    aibitat.chats = [
      { from: "USER", content: "q" },
      { from: "ASSISTANT", content: "a" },
    ];
    await aibitat._fireMessage({ from: "ASSISTANT", content: "a" });
    const [, payload] = upsertSpy.mock.calls[0];
    expect(payload.response.metrics).toEqual({});
  });

  test("silently swallows errors thrown by store", async () => {
    jest.spyOn(WorkspaceChats, "upsert").mockRejectedValue(new Error("boom"));
    const aibitat = buildAibitat({ trackedChatId: 1 });
    const plugin = getPlugin();
    plugin.setup(aibitat);
    aibitat.chats = [
      { from: "USER", content: "q" },
      { from: "ASSISTANT", content: "a" },
    ];
    await expect(
      aibitat._fireMessage({ from: "ASSISTANT", content: "a" }),
    ).resolves.toBeUndefined();
  });
});

describe("chat-history plugin — _storeSpecial options", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("merges existingSources with pending citations", async () => {
    const upsertSpy = jest.spyOn(WorkspaceChats, "upsert").mockResolvedValue({});
    const aibitat = buildAibitat({ trackedChatId: 1 });
    aibitat._pendingCitations = [{ id: "c2" }];
    const plugin = getPlugin();
    await plugin._storeSpecial(aibitat, {
      prompt: "p",
      response: "r",
      attachments: [],
      options: {
        sources: [{ id: "c1" }],
        saveAsType: "chat",
        postSave: jest.fn(),
      },
    });
    const [, payload] = upsertSpy.mock.calls[0];
    expect(payload.response.sources).toEqual([{ id: "c1" }, { id: "c2" }]);
  });

  test("invokes options.postSave after upsert", async () => {
    jest.spyOn(WorkspaceChats, "upsert").mockResolvedValue({});
    const postSave = jest.fn();
    const aibitat = buildAibitat({ trackedChatId: 1 });
    const plugin = getPlugin();
    await plugin._storeSpecial(aibitat, {
      prompt: "p",
      response: "r",
      attachments: [],
      options: { postSave, saveAsType: "chat" },
    });
    expect(postSave).toHaveBeenCalledTimes(1);
  });
});

describe("chat-history plugin — _autoRenameThread", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("returns true when there is no thread_id", async () => {
    const aibitat = buildAibitat();
    aibitat.handlerProps.invocation.thread_id = null;
    const plugin = getPlugin();
    expect(await plugin._autoRenameThread(aibitat, "hi")).toBe(true);
  });

  test("returns true when the thread cannot be fetched", async () => {
    jest.spyOn(WorkspaceThread, "get").mockResolvedValue(null);
    const aibitat = buildAibitat();
    aibitat.handlerProps.invocation.thread_id = "t1";
    const plugin = getPlugin();
    expect(await plugin._autoRenameThread(aibitat, "hi")).toBe(true);
  });

  test("returns true when the workspace cannot be fetched", async () => {
    jest.spyOn(WorkspaceThread, "get").mockResolvedValue({ slug: "x" });
    jest.spyOn(Workspace, "get").mockResolvedValue(null);
    const aibitat = buildAibitat();
    aibitat.handlerProps.invocation.thread_id = "t1";
    const plugin = getPlugin();
    expect(await plugin._autoRenameThread(aibitat, "hi")).toBe(true);
  });

  test("calls autoRenameThread and emits rename_thread socket message", async () => {
    const send = jest.fn();
    jest.spyOn(WorkspaceThread, "get").mockResolvedValue({ id: 1, slug: "old" });
    jest.spyOn(Workspace, "get").mockResolvedValue({ id: 1 });
    const autoRenameSpy = jest
      .spyOn(WorkspaceThread, "autoRenameThread")
      .mockImplementation(async ({ onRename }) => {
        onRename({ slug: "new-slug", name: "New" });
      });
    const aibitat = buildAibitat();
    aibitat.handlerProps.invocation.thread_id = "t1";
    aibitat.socket = { send };
    const plugin = getPlugin();
    expect(await plugin._autoRenameThread(aibitat, "hi")).toBe(true);
    expect(autoRenameSpy).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("rename_thread", {
      slug: "new-slug",
      name: "New",
    });
  });
});

describe("chat-history plugin — _cleanup", () => {
  test("clears citations, outputs, surveys, and tracked chat id", () => {
    const aibitat = buildAibitat({ trackedChatId: 1 });
    aibitat._pendingOutputs = [{ x: 1 }];
    const plugin = getPlugin();
    plugin._cleanup(aibitat);
    expect(aibitat._pendingOutputs).toEqual([]);
    expect(aibitat.clearCitations).toHaveBeenCalled();
    expect(aibitat.clearClarifyingQuestionSurveys).toHaveBeenCalled();
    expect(aibitat.clearTrackedChatId).toHaveBeenCalled();
  });
});
