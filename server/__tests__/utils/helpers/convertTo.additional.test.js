// SPDX-License-Identifier: MIT
jest.mock("../../../models/workspaceChats", () => ({
  WorkspaceChats: { whereWithData: jest.fn() },
}));
jest.mock("../../../models/embedChats", () => ({
  EmbedChats: { whereWithEmbedAndWorkspace: jest.fn() },
}));
jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: { saneDefaultSystemPrompt: "You are a helpful assistant." },
}));
jest.mock("../../../utils/http", () => ({
  safeJsonParse: jest.fn((str, fallback) => {
    try { return JSON.parse(str); } catch { return fallback !== undefined ? fallback : {}; }
  }),
}));

const {
  prepareChatsForExport,
  exportChatsAsType,
} = require("../../../utils/helpers/chat/convertTo");
const { WorkspaceChats } = require("../../../models/workspaceChats");
const { EmbedChats } = require("../../../models/embedChats");

function makeChat(overrides = {}) {
  return {
    id: 1,
    prompt: "What is AI?",
    response: JSON.stringify({ text: "AI is intelligence.", sources: [], attachments: [] }),
    workspaceId: 10,
    createdAt: "2025-01-01T00:00:00Z",
    workspace: { name: "Test Workspace", openAiPrompt: "Custom prompt" },
    user: { username: "alice" },
    api_session_id: null,
    feedbackScore: null,
    ...overrides,
  };
}

describe("convertTo helpers — additional coverage", () => {
  afterEach(() => jest.clearAllMocks());

  describe("prepareChatsForExport — jsonl format", () => {
    it("builds workspaceChatsMap with system prompt", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([makeChat()]);
      const result = await prepareChatsForExport("jsonl", "workspace");
      expect(result).toHaveProperty("10");
      expect(result[10].messages[0].role).toBe("system");
    });

    it("groups chats by workspaceId", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([
        makeChat({ id: 1, workspaceId: 10 }),
        makeChat({ id: 2, workspaceId: 20 }),
        makeChat({ id: 3, workspaceId: 10 }),
      ]);
      const result = await prepareChatsForExport("jsonl", "workspace");
      expect(Object.keys(result)).toEqual(["10", "20"]);
      expect(result[10].messages.length).toBe(5);
      expect(result[20].messages.length).toBe(3);
    });

    it("uses saneDefaultSystemPrompt when workspace has no openAiPrompt", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([
        makeChat({ workspace: { name: "WS", openAiPrompt: null } }),
      ]);
      const result = await prepareChatsForExport("jsonl", "workspace");
      expect(result[10].messages[0].content[0].text).toBe("You are a helpful assistant.");
    });

    it("includes attachments in user content blocks", async () => {
      const responseWithAttachments = JSON.stringify({
        text: "See image",
        sources: [],
        attachments: [{ contentString: "data:image/png;base64,abc", mime: "image/png" }],
      });
      WorkspaceChats.whereWithData.mockResolvedValue([makeChat({ response: responseWithAttachments })]);
      const result = await prepareChatsForExport("jsonl", "workspace");
      const userMsg = result[10].messages[1];
      expect(userMsg.content.length).toBe(2);
    });
  });

  describe("prepareChatsForExport — csv format", () => {
    it("produces flat records with expected keys", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([makeChat()]);
      const result = await prepareChatsForExport("csv", "workspace");
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("workspace");
      expect(result[0]).toHaveProperty("prompt");
      expect(result[0]).toHaveProperty("response");
      expect(result[0]).toHaveProperty("sent_at");
      expect(result[0]).toHaveProperty("username");
      expect(result[0]).toHaveProperty("rating");
    });

    it("maps feedbackScore to GOOD/BAD/-- strings", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([
        makeChat({ feedbackScore: true }),
        makeChat({ feedbackScore: false }),
        makeChat({ feedbackScore: null }),
      ]);
      const result = await prepareChatsForExport("csv", "workspace");
      expect(result[0].rating).toBe("GOOD");
      expect(result[1].rating).toBe("BAD");
      expect(result[2].rating).toBe("--");
    });

    it("shows API for api_session_id users", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([makeChat({ user: null, api_session_id: "sess-1" })]);
      const result = await prepareChatsForExport("csv", "workspace");
      expect(result[0].username).toBe("API");
    });

    it("shows unknown user when no user and no api_session", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([makeChat({ user: null, api_session_id: null })]);
      const result = await prepareChatsForExport("csv", "workspace");
      expect(result[0].username).toBe("unknown user");
    });

    it("embed chatType uses embed_config for workspace name", async () => {
      EmbedChats.whereWithEmbedAndWorkspace.mockResolvedValue([{
        id: 1, prompt: "hi",
        response: JSON.stringify({ text: "hello", sources: [], attachments: [] }),
        createdAt: "2025-01-01",
        embed_config: { workspace: { name: "Embed WS" } },
      }]);
      const result = await prepareChatsForExport("csv", "embed");
      expect(result[0].workspace).toBe("Embed WS");
    });
  });

  describe("prepareChatsForExport — json format", () => {
    it("includes attachments in json format", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([makeChat()]);
      const result = await prepareChatsForExport("json", "workspace");
      expect(result[0]).toHaveProperty("attachments");
    });
  });

  describe("prepareChatsForExport — jsonAlpaca format", () => {
    it("produces instruction/input/output structure", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([makeChat()]);
      const result = await prepareChatsForExport("jsonAlpaca", "workspace");
      expect(result[0]).toHaveProperty("instruction");
      expect(result[0]).toHaveProperty("input");
      expect(result[0]).toHaveProperty("output");
    });

    it("includes context in instruction when sources exist", async () => {
      const responseWithSources = JSON.stringify({
        text: "Answer", sources: [{ text: "source text here" }], attachments: [],
      });
      WorkspaceChats.whereWithData.mockResolvedValue([makeChat({ response: responseWithSources })]);
      const result = await prepareChatsForExport("jsonAlpaca", "workspace");
      expect(result[0].instruction).toContain("CONTEXT");
    });
  });

  describe("prepareChatsForExport — error handling", () => {
    it("throws for invalid format", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([]);
      await expect(prepareChatsForExport("xml", "workspace")).rejects.toThrow("Invalid export type");
    });

    it("throws for invalid chatType", async () => {
      await expect(prepareChatsForExport("jsonl", "unknown")).rejects.toThrow("Invalid chat type");
    });
  });

  describe("exportChatsAsType", () => {
    it("throws for unrecognized format since prepareChatsForExport validates first", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([]);
      await expect(exportChatsAsType("unknown_format", "workspace")).rejects.toThrow("Invalid export type");
    });

    it("returns jsonl content type for jsonl format", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([]);
      const result = await exportChatsAsType("jsonl", "workspace");
      expect(result.contentType).toBe("application/jsonl");
    });

    it("returns correct content type for csv", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([]);
      const result = await exportChatsAsType("csv", "workspace");
      expect(result.contentType).toBe("text/csv");
    });

    it("returns correct content type for json", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([]);
      const result = await exportChatsAsType("json", "workspace");
      expect(result.contentType).toBe("application/json");
    });
  });
});
