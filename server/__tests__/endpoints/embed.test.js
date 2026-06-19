// SPDX-License-Identifier: MIT


jest.mock("../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
}));
jest.mock("../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("../../utils/chats/embed");
jest.mock("../../models/embedChats");
jest.mock("../../models/telemetry");
jest.mock("../../utils/helpers/chat/responses");
jest.mock("../../utils/http", () => ({
  reqBody: jest.fn((req) => req.body),
  multiUserMode: jest.fn(() => false),
}));
jest.mock("../../utils/chats/embed", () => ({ streamChatWithForEmbed: jest.fn() }));
jest.mock("../../utils/middleware/embedMiddleware", () => ({
  validEmbedConfig: (_req, _res, next) => next(),
  canRespond: (_req, _res, next) => next(),
  setConnectionMeta: (_req, _res, next) => next(),
}));

const { streamChatWithForEmbed } = require("../../utils/chats/embed");
const { EmbedChats } = require("../../models/embedChats");
const { Telemetry } = require("../../models/telemetry");
const { writeResponseChunk, convertToChatHistory } = require("../../utils/helpers/chat/responses");
const { reqBody, multiUserMode } = require("../../utils/http");
const { createMockApp } = require("../helpers/mockExpressApp");
const { embeddedEndpoints } = require("../../endpoints/embed");

const EMBED_LOCALS = { embedConfig: { id: 1, workspace_id: 5 } };

function buildApp() {
  const harness = createMockApp();
  embeddedEndpoints(harness.app);
  return harness;
}

describe("embeddedEndpoints", () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    streamChatWithForEmbed.mockResolvedValue();
    Telemetry.sendTelemetry.mockResolvedValue();
    writeResponseChunk.mockReturnValue();
    convertToChatHistory.mockImplementation((h) => h);
  });
  afterEach(() => jest.clearAllMocks());

  describe("POST /embed/:embedId/stream-chat", () => {
    it("streams an embed chat", async () => {
      const res = await app.call("post", "/embed/1/stream-chat", {
        body: { sessionId: "s1", message: "hello" },
        locals: EMBED_LOCALS,
      });
      expect(streamChatWithForEmbed).toHaveBeenCalled();
      expect(Telemetry.sendTelemetry).toHaveBeenCalled();
    });

    it("sets SSE headers", async () => {
      const res = await app.call("post", "/embed/1/stream-chat", {
        body: { sessionId: "s1", message: "hello" },
        locals: EMBED_LOCALS,
      });
      expect(res.headers["Content-Type"]).toBe("text/event-stream");
    });

    it("passes optional overrides", async () => {
      await app.call("post", "/embed/1/stream-chat", {
        body: { sessionId: "s1", message: "hi", prompt: "sys", model: "gpt-4", temperature: 0.5, username: "bob" },
        locals: EMBED_LOCALS,
      });
      expect(streamChatWithForEmbed).toHaveBeenCalledWith(
        expect.any(Object),
        EMBED_LOCALS.embedConfig,
        "hi",
        "s1",
        { promptOverride: "sys", modelOverride: "gpt-4", temperatureOverride: 0.5, username: "bob" },
      );
    });

    it("handles errors gracefully", async () => {
      streamChatWithForEmbed.mockRejectedValue(new Error("LLM down"));
      const res = await app.call("post", "/embed/1/stream-chat", {
        body: { sessionId: "s1", message: "hello" },
        locals: EMBED_LOCALS,
      });
      expect(writeResponseChunk).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ error: "Internal server error" }),
      );
      expect(writeResponseChunk).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ errorId: expect.any(String) }),
      );
    });
  });

  describe("GET /embed/:embedId/:sessionId", () => {
    it("returns chat history", async () => {
      EmbedChats.forEmbedByUser.mockResolvedValue([{ id: 1 }]);
      const res = await app.call("get", "/embed/1/s1", { locals: EMBED_LOCALS });
      expect(res.statusCode).toBe(200);
      expect(res.body.history).toBeDefined();
    });

    it("returns 500 on error", async () => {
      EmbedChats.forEmbedByUser.mockRejectedValue(new Error("fail"));
      const res = await app.call("get", "/embed/1/s1", { locals: EMBED_LOCALS });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /embed/:embedId/:sessionId", () => {
    it("marks history invalid", async () => {
      EmbedChats.markHistoryInvalid.mockResolvedValue();
      const res = await app.call("delete", "/embed/1/s1", { locals: EMBED_LOCALS });
      expect(res.statusCode).toBe(200);
    });

    it("returns 500 on error", async () => {
      EmbedChats.markHistoryInvalid.mockRejectedValue(new Error("fail"));
      const res = await app.call("delete", "/embed/1/s1", { locals: EMBED_LOCALS });
      expect(res.statusCode).toBe(500);
    });
  });
});
