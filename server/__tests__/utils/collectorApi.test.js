// SPDX-License-Identifier: MIT
/* eslint-env jest */
// Tests for server/utils/collectorApi/index.js — CollectorApi (Issue #388)
//
// CollectorApi communicates with the document collector service via fetch.
// We mock global fetch, CommunicationKey, and EncryptionManager to isolate
// the API logic: endpoint construction, request formatting, error handling,
// timeout behavior, and response parsing.

// --- Mock dependencies ---
jest.mock("../../utils/logger/console.js", () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

jest.mock("../../utils/comKey", () => ({
  CommunicationKey: jest.fn().mockImplementation(() => ({
    sign: jest.fn().mockReturnValue("mock-signature"),
    encrypt: jest.fn().mockReturnValue("mock-encrypted-payload"),
  })),
}));

jest.mock("../../utils/EncryptionManager", () => ({
  EncryptionManager: jest.fn().mockImplementation(() => ({
    xPayload: "mock-x-payload",
  })),
}));

jest.mock("undici", () => ({
  Agent: jest.fn().mockImplementation(() => ({})),
}));

// --- fetch mock ---
const mockFetch = jest.fn();
global.fetch = mockFetch;

const { CollectorApi } = require("../../utils/collectorApi");

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
});

afterEach(() => {
  delete process.env.COLLECTOR_PORT;
  delete process.env.COLLECTOR_PROCESS_TIMEOUT_MS;
  delete process.env.WHISPER_PROVIDER;
  delete process.env.WHISPER_MODEL_PREF;
  delete process.env.OPEN_AI_KEY;
  delete process.env.TARGET_OCR_LANG;
  delete process.env.COLLECTOR_ALLOW_ANY_IP;
});

describe("CollectorApi — getCollectorPort (static)", () => {
  it("returns default port 8888 when COLLECTOR_PORT is not set", () => {
    delete process.env.COLLECTOR_PORT;
    expect(CollectorApi.getCollectorPort()).toBe(8888);
  });

  it("returns the port from COLLECTOR_PORT env var", () => {
    process.env.COLLECTOR_PORT = "9999";
    expect(CollectorApi.getCollectorPort()).toBe(9999);
  });

  it("falls back to default for non-integer port", () => {
    process.env.COLLECTOR_PORT = "abc";
    expect(CollectorApi.getCollectorPort()).toBe(8888);
  });

  it("falls back to default for port 0", () => {
    process.env.COLLECTOR_PORT = "0";
    expect(CollectorApi.getCollectorPort()).toBe(8888);
  });

  it("falls back to default for negative port", () => {
    process.env.COLLECTOR_PORT = "-1";
    expect(CollectorApi.getCollectorPort()).toBe(8888);
  });

  it("falls back to default for port > 65535", () => {
    process.env.COLLECTOR_PORT = "70000";
    expect(CollectorApi.getCollectorPort()).toBe(8888);
  });

  it("accepts port 1 (minimum valid)", () => {
    process.env.COLLECTOR_PORT = "1";
    expect(CollectorApi.getCollectorPort()).toBe(1);
  });

  it("accepts port 65535 (maximum valid)", () => {
    process.env.COLLECTOR_PORT = "65535";
    expect(CollectorApi.getCollectorPort()).toBe(65535);
  });
});

describe("CollectorApi — constructor", () => {
  it("creates an endpoint with the correct port", () => {
    process.env.COLLECTOR_PORT = "7777";
    const api = new CollectorApi();
    expect(api.endpoint).toBe("http://0.0.0.0:7777");
  });

  it("uses default port when COLLECTOR_PORT is not set", () => {
    delete process.env.COLLECTOR_PORT;
    const api = new CollectorApi();
    expect(api.endpoint).toBe("http://0.0.0.0:8888");
  });

  it("initializes comkey for request signing", () => {
    const api = new CollectorApi();
    expect(api.comkey).toBeDefined();
    expect(typeof api.comkey.sign).toBe("function");
    expect(typeof api.comkey.encrypt).toBe("function");
  });
});

describe("CollectorApi — online()", () => {
  it("returns true when /accepts responds ok", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const api = new CollectorApi();

    const result = await api.online();

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/accepts"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("returns false when fetch throws (network error)", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    const api = new CollectorApi();

    const result = await api.online();
    expect(result).toBe(false);
  });

  it("returns false when response is not ok", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const api = new CollectorApi();

    const result = await api.online();
    expect(result).toBe(false);
  });
});

describe("CollectorApi — acceptedFileTypes()", () => {
  it("returns parsed JSON when response is ok", async () => {
    const mockData = { accepted: ["pdf", "txt", "docx"] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockData),
    });
    const api = new CollectorApi();

    const result = await api.acceptedFileTypes();
    expect(result).toEqual(mockData);
  });

  it("returns null when fetch throws a network error", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));
    const api = new CollectorApi();

    const result = await api.acceptedFileTypes();
    expect(result).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: jest.fn(),
    });
    const api = new CollectorApi();

    const result = await api.acceptedFileTypes();
    expect(result).toBeNull();
  });
});

describe("CollectorApi — processDocument()", () => {
  it("returns false when filename is empty", async () => {
    const api = new CollectorApi();
    const result = await api.processDocument("");
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns false when filename is not provided", async () => {
    const api = new CollectorApi();
    const result = await api.processDocument();
    expect(result).toBe(false);
  });

  it("sends POST to /process with filename, metadata, and options", async () => {
    const mockResponse = { success: true, documents: [{ id: 1 }] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    const api = new CollectorApi();

    const result = await api.processDocument("test.pdf", { author: "John" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/process"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Integrity": "mock-signature",
          "X-Payload-Signer": "mock-encrypted-payload",
        }),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("returns error object when response is not ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: jest.fn(),
    });
    const api = new CollectorApi();

    const result = await api.processDocument("test.pdf");

    expect(result.success).toBe(false);
    expect(result.reason).toContain("could not be completed");
    expect(result.documents).toEqual([]);
  });

  it("returns error object on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    const api = new CollectorApi();

    const result = await api.processDocument("test.pdf");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("ECONNREFUSED");
    expect(result.documents).toEqual([]);
  });
});

describe("CollectorApi — processLink()", () => {
  it("returns false when link is empty", async () => {
    const api = new CollectorApi();
    const result = await api.processLink("");
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends POST to /process-link with link and options", async () => {
    const mockResponse = { success: true, documents: [] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    const api = new CollectorApi();

    const result = await api.processLink("https://example.com", {}, { source: "web" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/process-link"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("returns error object on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("timeout"));
    const api = new CollectorApi();

    const result = await api.processLink("https://example.com");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("timeout");
  });
});

describe("CollectorApi — processRawText()", () => {
  it("sends POST to /process-raw-text with textContent", async () => {
    const mockResponse = { success: true };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    const api = new CollectorApi();

    const result = await api.processRawText("Hello world", { title: "test" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/process-raw-text"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("returns error object when response is not ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: jest.fn(),
    });
    const api = new CollectorApi();

    const result = await api.processRawText("Hello");

    expect(result.success).toBe(false);
    expect(result.documents).toEqual([]);
  });
});

describe("CollectorApi — convertAudioToWav()", () => {
  it("returns error object when filename is empty", async () => {
    const api = new CollectorApi();
    const result = await api.convertAudioToWav("");

    expect(result.success).toBe(false);
    expect(result.reason).toContain("No filename provided");
    expect(result.wavFilename).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends POST to /util/convert-audio-to-wav", async () => {
    const mockResponse = { success: true, wavFilename: "output.wav" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    const api = new CollectorApi();

    const result = await api.convertAudioToWav("audio.mp3");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/util/convert-audio-to-wav"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("returns error object on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("connection refused"));
    const api = new CollectorApi();

    const result = await api.convertAudioToWav("audio.mp3");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("connection refused");
    expect(result.wavFilename).toBeNull();
  });
});

describe("CollectorApi — forwardExtensionRequest()", () => {
  it("sends request to the specified endpoint with method and body", async () => {
    const mockResponse = { success: true, data: { result: "ok" } };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    const api = new CollectorApi();

    const result = await api.forwardExtensionRequest({
      endpoint: "/ext/process",
      method: "POST",
      body: { key: "value" },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/ext/process"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("accepts string body directly", async () => {
    const mockResponse = { success: true };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    const api = new CollectorApi();

    await api.forwardExtensionRequest({
      endpoint: "/ext/test",
      method: "PUT",
      body: '{"raw":"json"}',
    });

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.body).toBe('{"raw":"json"}');
  });

  it("returns error object on failure", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));
    const api = new CollectorApi();

    const result = await api.forwardExtensionRequest({
      endpoint: "/ext/test",
      method: "GET",
      body: {},
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("network error");
    expect(result.data).toEqual({});
  });
});

describe("CollectorApi — getLinkContent()", () => {
  it("returns false when link is empty", async () => {
    const api = new CollectorApi();
    const result = await api.getLinkContent("");
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends POST to /util/get-link with link and captureAs", async () => {
    const mockResponse = { success: true, content: "extracted text" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    const api = new CollectorApi();

    const result = await api.getLinkContent("https://example.com", "html");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/util/get-link"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("returns error object on network failure with null content", async () => {
    mockFetch.mockRejectedValue(new Error("timeout"));
    const api = new CollectorApi();

    const result = await api.getLinkContent("https://example.com");

    expect(result.success).toBe(false);
    expect(result.content).toBeNull();
  });
});

describe("CollectorApi — parseDocument()", () => {
  it("returns false when filename is empty", async () => {
    const api = new CollectorApi();
    const result = await api.parseDocument("");
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends POST to /parse with filename and options", async () => {
    const mockResponse = { success: true, documents: [{ page: 1 }] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    const api = new CollectorApi();

    const result = await api.parseDocument("doc.pdf", { absolutePath: "/tmp/doc.pdf" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/parse"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("includes absolutePath in options when provided", async () => {
    const mockResponse = { success: true, documents: [] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    const api = new CollectorApi();

    await api.parseDocument("doc.pdf", { absolutePath: "/custom/path/doc.pdf" });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.options.absolutePath).toBe("/custom/path/doc.pdf");
  });

  it("sets absolutePath to null when not provided", async () => {
    const mockResponse = { success: true, documents: [] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    const api = new CollectorApi();

    await api.parseDocument("doc.pdf");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.options.absolutePath).toBeNull();
  });

  it("returns error object on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNRESET"));
    const api = new CollectorApi();

    const result = await api.parseDocument("doc.pdf");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("ECONNRESET");
    expect(result.documents).toEqual([]);
  });
});

describe("CollectorApi — request signing", () => {
  it("includes X-Integrity and X-Payload-Signer headers in all POST requests", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    });
    const api = new CollectorApi();

    await api.processDocument("test.pdf");

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Integrity"]).toBe("mock-signature");
    expect(headers["X-Payload-Signer"]).toBe("mock-encrypted-payload");
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

describe("CollectorApi — timeout handling", () => {
  it("uses AbortSignal.timeout for health check requests", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const api = new CollectorApi();

    await api.online();

    const signal = mockFetch.mock.calls[0][1].signal;
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("uses AbortSignal.timeout for process requests", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    });
    const api = new CollectorApi();

    await api.processDocument("test.pdf");

    const signal = mockFetch.mock.calls[0][1].signal;
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("handles timeout abort errors gracefully in processDocument", async () => {
    mockFetch.mockRejectedValue(new Error("The operation was aborted"));
    const api = new CollectorApi();

    const result = await api.processDocument("test.pdf");

    expect(result.success).toBe(false);
    expect(result.reason).toContain("aborted");
  });
});
