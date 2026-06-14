// SPDX-License-Identifier: MIT
const originalEnv = {
  VANE_CHAT_PROVIDER_ID: process.env.VANE_CHAT_PROVIDER_ID,
  VANE_CHAT_MODEL_KEY: process.env.VANE_CHAT_MODEL_KEY,
  VANE_EMBED_PROVIDER_ID: process.env.VANE_EMBED_PROVIDER_ID,
  VANE_EMBED_MODEL_KEY: process.env.VANE_EMBED_MODEL_KEY,
  VANE_API_URL: process.env.VANE_API_URL,
};

function resetEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function loadVaneClient() {
  jest.resetModules();
  return require("../../../utils/research/vaneClient").VaneClient;
}

describe("VaneClient", () => {
  afterEach(() => {
    jest.clearAllMocks();
    if (global.fetch && global.fetch.mockRestore) global.fetch.mockRestore();
    resetEnv();
  });

  describe("isAvailable", () => {
    it("returns true when Vane responds ok", async () => {
      const VaneClient = loadVaneClient();
      jest.spyOn(global, "fetch").mockResolvedValue({ ok: true });
      const available = await VaneClient.isAvailable();
      expect(available).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/providers"),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it("returns false when Vane is unreachable", async () => {
      const VaneClient = loadVaneClient();
      jest.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
      const available = await VaneClient.isAvailable();
      expect(available).toBe(false);
    });

    it("uses AbortSignal.timeout with 3000ms", async () => {
      const VaneClient = loadVaneClient();
      const fakeSignal = { aborted: false };
      const timeoutSpy = jest.spyOn(AbortSignal, "timeout").mockReturnValue(fakeSignal);
      const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true });
      try {
        await VaneClient.isAvailable();
        expect(timeoutSpy).toHaveBeenCalledWith(3000);
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("/api/providers"),
          expect.objectContaining({ signal: fakeSignal })
        );
      } finally {
        timeoutSpy.mockRestore();
      }
    });

    it("uses VANE_API_URL env override", async () => {
      process.env.VANE_API_URL = "http://custom:9000";
      const VaneClient = loadVaneClient();
      const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: false });
      await VaneClient.isAvailable();
      expect(fetchMock).toHaveBeenCalledWith(
        "http://custom:9000/api/providers",
        expect.anything()
      );
    });
  });

  describe("resolveModels", () => {
    it("returns null when Vane providers endpoint fails", async () => {
      const VaneClient = loadVaneClient();
      jest.spyOn(global, "fetch").mockResolvedValue({ ok: false });
      const models = await VaneClient.resolveModels();
      expect(models).toBeNull();
    });

    it("returns null when Vane is unreachable", async () => {
      const VaneClient = loadVaneClient();
      jest.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));
      const models = await VaneClient.resolveModels();
      expect(models).toBeNull();
    });

    it("uses env overrides when set", async () => {
      process.env.VANE_CHAT_PROVIDER_ID = "openai";
      process.env.VANE_CHAT_MODEL_KEY = "gpt-4o";
      process.env.VANE_EMBED_PROVIDER_ID = "openai-embed";
      process.env.VANE_EMBED_MODEL_KEY = "text-embedding-3";
      const VaneClient = loadVaneClient();
      const models = await VaneClient.resolveModels();
      expect(models).toEqual({
        chatModel: { providerId: "openai", key: "gpt-4o" },
        embeddingModel: { providerId: "openai-embed", key: "text-embedding-3" },
      });
    });

    it("discovers first chat and embedding providers from Vane", async () => {
      const VaneClient = loadVaneClient();
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          providers: [
            {
              id: "ollama",
              chatModels: [{ key: "llama3" }],
              embeddingModels: [],
            },
            {
              id: "openai",
              chatModels: [{ key: "gpt-4o" }],
              embeddingModels: [{ key: "text-embedding-3" }],
            },
          ],
        }),
      });
      const models = await VaneClient.resolveModels();
      expect(models).toEqual({
        chatModel: { providerId: "ollama", key: "llama3" },
        embeddingModel: { providerId: "openai", key: "text-embedding-3" },
      });
    });

    it("returns null when no provider has chat models", async () => {
      const VaneClient = loadVaneClient();
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          providers: [{ id: "embed-only", chatModels: [], embeddingModels: [{ key: "e" }] }],
        }),
      });
      const models = await VaneClient.resolveModels();
      expect(models).toBeNull();
    });

    it("caches provider results and avoids refetching within TTL", async () => {
      const VaneClient = loadVaneClient();
      const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          providers: [{ id: "p", chatModels: [{ key: "m" }], embeddingModels: [{ key: "e" }] }],
        }),
      });
      await VaneClient.resolveModels();
      await VaneClient.resolveModels();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("refetches after cache TTL expires", async () => {
      const VaneClient = loadVaneClient();
      const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          providers: [{ id: "p", chatModels: [{ key: "m" }], embeddingModels: [{ key: "e" }] }],
        }),
      });
      await VaneClient.resolveModels();
      const nowSpy = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 6 * 60 * 1000);
      try {
        await VaneClient.resolveModels();
        expect(fetchMock).toHaveBeenCalledTimes(2);
      } finally {
        nowSpy.mockRestore();
      }
    });
  });

  describe("answer", () => {
    it("returns null when model resolution fails", async () => {
      const VaneClient = loadVaneClient();
      jest.spyOn(global, "fetch").mockResolvedValue({ ok: false });
      const result = await VaneClient.answer("latest AI news");
      expect(result).toBeNull();
    });

    it("returns cited answer and sources on success", async () => {
      const VaneClient = loadVaneClient();
      jest.spyOn(global, "fetch")
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            providers: [{ id: "p", chatModels: [{ key: "m" }], embeddingModels: [{ key: "e" }] }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: "The answer is 42.",
            sources: [{ content: "Source content", metadata: { url: "https://example.com" } }],
          }),
        });
      const result = await VaneClient.answer("what is the answer?");
      expect(result).toEqual({
        message: "The answer is 42.",
        sources: [{ content: "Source content", metadata: { url: "https://example.com" } }],
      });
    });

    it("returns null when search endpoint fails", async () => {
      const VaneClient = loadVaneClient();
      jest.spyOn(global, "fetch")
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            providers: [{ id: "p", chatModels: [{ key: "m" }], embeddingModels: [{ key: "e" }] }],
          }),
        })
        .mockResolvedValueOnce({ ok: false });
      const result = await VaneClient.answer("query");
      expect(result).toBeNull();
    });

    it("returns empty sources array when answer has no sources", async () => {
      const VaneClient = loadVaneClient();
      jest.spyOn(global, "fetch")
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            providers: [{ id: "p", chatModels: [{ key: "m" }], embeddingModels: [{ key: "e" }] }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: "Answer",
            sources: [],
          }),
        });
      const result = await VaneClient.answer("query");
      expect(result).toEqual({ message: "Answer", sources: [] });
    });
  });

  describe("search", () => {
    it("maps Vane sources into WebSearchEngine shape", async () => {
      const VaneClient = loadVaneClient();
      jest.spyOn(global, "fetch")
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            providers: [{ id: "p", chatModels: [{ key: "m" }], embeddingModels: [{ key: "e" }] }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: "Answer",
            sources: [
              { content: "Snippet text", metadata: { url: "https://result.de", title: "Result" } },
            ],
          }),
        });
      const results = await VaneClient.search("query");
      expect(results).toEqual([
        { title: "Result", link: "https://result.de", snippet: "Snippet text" },
      ]);
    });

    it("returns an empty array when answer fails", async () => {
      const VaneClient = loadVaneClient();
      jest.spyOn(global, "fetch").mockResolvedValue({ ok: false });
      const results = await VaneClient.search("query");
      expect(results).toEqual([]);
    });

    it("filters out sources without metadata.url", async () => {
      const VaneClient = loadVaneClient();
      jest.spyOn(global, "fetch")
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            providers: [{ id: "p", chatModels: [{ key: "m" }], embeddingModels: [{ key: "e" }] }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: "Answer",
            sources: [
              { content: "Has URL", metadata: { url: "https://has.url" } },
              { content: "No URL", metadata: {} },
              { content: "No metadata" },
            ],
          }),
        });
      const results = await VaneClient.search("query");
      expect(results).toEqual([
        { title: "https://has.url", link: "https://has.url", snippet: "Has URL" },
      ]);
    });
  });
});
