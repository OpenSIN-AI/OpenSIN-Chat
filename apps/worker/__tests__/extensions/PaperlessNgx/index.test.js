// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

// Tests for the Paperless-ngx connector orchestrator.
// Strategy: mock `html-to-text` and `pdf-parse` so the real
// PaperlessNgxLoader class can be required, then stub its `load` method
// on the prototype so all instances return our controlled docs.

jest.mock("slugify", () => {
  const fn = (str) => String(str).toLowerCase().replace(/\s+/g, "-");
  return { default: fn, __esModule: true };
}, { virtual: true });

let mockUuidCounter = 0;
jest.mock("uuid", () => ({
  v4: jest.fn(() => {
    mockUuidCounter += 1;
    return `uuid-${mockUuidCounter}`;
  }),
}), { virtual: true });

jest.mock("../../../utils/files", () => ({
  writeToServerDocuments: jest.fn(({ data, filename, destinationOverride }) => ({
    ...data,
    location: `documents/${filename}.json`,
    destinationOverride: destinationOverride || "default",
  })),
  sanitizeFileName: jest.fn((name) => name),
  documentsFolder: "/fake/documents",
}));

jest.mock("../../../utils/tokenizer", () => ({
  tokenizeString: jest.fn(() => 7),
}));

jest.mock("../../../utils/http", () => ({
  validBaseUrl: jest.fn(() => true),
}));

jest.mock("html-to-text", () => ({
  htmlToText: jest.fn((html) => html || ""),
}), { virtual: true });

jest.mock("pdf-parse", () => jest.fn(() => Promise.resolve({ text: "PDF text" })), {
  virtual: true,
});

jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

const { loadPaperlessNgx } = require("../../../utils/extensions/PaperlessNgx");
const { validBaseUrl } = require("../../../utils/http");
const { writeToServerDocuments } = require("../../../utils/files");
const { tokenizeString } = require("../../../utils/tokenizer");
const PaperlessNgxLoader = require("../../../utils/extensions/PaperlessNgx/PaperlessNgxLoader");

const makeResponse = () => ({
  locals: {
    encryptionWorker: {
      encrypt: jest.fn((s) => `enc(${s})`),
    },
  },
});

const makeDoc = (overrides = {}) => ({
  pageContent: "Document content goes here",
  metadata: {
    id: 1,
    title: "Test Document",
    created: "2024-01-01",
    correspondent: "Acme",
    url: "https://paperless.example.com/documents/1",
    ...overrides.metadata,
  },
  ...overrides,
});

describe("PaperlessNgx loadPaperlessNgx", () => {
  let mockLoad;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUuidCounter = 0;
    validBaseUrl.mockReturnValue(true);

    // The orchestrator expects `loader.load()` to return the docs array
    // directly (not wrapped in {docs, error}).
    mockLoad = jest.fn().mockResolvedValue([
      makeDoc(),
      makeDoc({
        metadata: {
          id: 2,
          title: "Doc 2",
          correspondent: "Foo",
          url: "https://paperless.example.com/documents/2",
          created: "2024-02-02",
        },
      }),
    ]);
    PaperlessNgxLoader.prototype.load = mockLoad;
  });

  afterEach(() => {
    delete PaperlessNgxLoader.prototype.load;
  });

  describe("input validation", () => {
    it("rejects when baseUrl is missing", async () => {
      const res = await loadPaperlessNgx({ apiToken: "tok" }, makeResponse());
      expect(res.success).toBe(false);
      expect(res.reason).toMatch(/base URL/i);
    });

    it("rejects when baseUrl is not valid", async () => {
      validBaseUrl.mockReturnValue(false);
      const res = await loadPaperlessNgx(
        { baseUrl: "not-a-url", apiToken: "tok" },
        makeResponse()
      );
      expect(res.success).toBe(false);
      expect(res.reason).toMatch(/base URL/i);
    });

    it("rejects when apiToken is missing", async () => {
      const res = await loadPaperlessNgx(
        { baseUrl: "https://paperless.example.com" },
        makeResponse()
      );
      expect(res.success).toBe(false);
      expect(res.reason).toMatch(/API token/i);
    });
  });

  describe("successful load", () => {
    it("returns success and metadata", async () => {
      const res = await loadPaperlessNgx(
        { baseUrl: "https://paperless.example.com", apiToken: "tok" },
        makeResponse()
      );
      expect(res.success).toBe(true);
      expect(res.reason).toBeNull();
      expect(res.data.files).toBe(2);
      expect(res.data.destination).toMatch(/^paperless-/);
    });

    it("calls the loader", async () => {
      await loadPaperlessNgx(
        { baseUrl: "https://paperless.example.com", apiToken: "secret" },
        makeResponse()
      );
      expect(mockLoad).toHaveBeenCalled();
    });

    it("writes each document to server documents", async () => {
      await loadPaperlessNgx(
        { baseUrl: "https://paperless.example.com", apiToken: "tok" },
        makeResponse()
      );
      expect(writeToServerDocuments).toHaveBeenCalledTimes(2);
    });

    it("uses tokenizeString for token count estimation", async () => {
      await loadPaperlessNgx(
        { baseUrl: "https://paperless.example.com", apiToken: "tok" },
        makeResponse()
      );
      expect(tokenizeString).toHaveBeenCalledWith("Document content goes here");
    });

    it("uses 'Unknown' as docAuthor when correspondent is missing", async () => {
      mockLoad.mockResolvedValue([
        makeDoc({
          metadata: {
            id: 1,
            title: "X",
            url: "u",
            correspondent: null,
            created: "c",
          },
        }),
      ]);
      await loadPaperlessNgx(
        { baseUrl: "https://paperless.example.com", apiToken: "tok" },
        makeResponse()
      );
      const call = writeToServerDocuments.mock.calls[0][0];
      expect(call.data.docAuthor).toBe("Unknown");
    });

    it("skips docs with no pageContent", async () => {
      mockLoad.mockResolvedValue([
        makeDoc({ pageContent: null }),
        makeDoc(),
      ]);
      const res = await loadPaperlessNgx(
        { baseUrl: "https://paperless.example.com", apiToken: "tok" },
        makeResponse()
      );
      expect(res.success).toBe(true);
      expect(writeToServerDocuments).toHaveBeenCalledTimes(1);
    });
  });

  describe("loader errors", () => {
    it("returns failure when loader throws", async () => {
      mockLoad.mockRejectedValue(new Error("Server boom"));
      const res = await loadPaperlessNgx(
        { baseUrl: "https://paperless.example.com", apiToken: "tok" },
        makeResponse()
      );
      expect(res.success).toBe(false);
      expect(res.reason).toContain("Server boom");
    });

    it("returns failure when loader returns empty array", async () => {
      mockLoad.mockResolvedValue([]);
      const res = await loadPaperlessNgx(
        { baseUrl: "https://paperless.example.com", apiToken: "tok" },
        makeResponse()
      );
      expect(res.success).toBe(false);
      expect(res.reason).toMatch(/no parseable/i);
    });
  });

  describe("chunk source generation", () => {
    it("uses the encryption worker from response.locals", async () => {
      const res = makeResponse();
      await loadPaperlessNgx(
        { baseUrl: "https://paperless.example.com", apiToken: "tok" },
        res
      );
      const call = writeToServerDocuments.mock.calls[0][0];
      expect(res.locals.encryptionWorker.encrypt).toHaveBeenCalled();
      // The chunkSource uses paperless-ngx:// scheme
      expect(call.data.chunkSource).toMatch(/^paperless-ngx:\/\//);
      expect(call.data.chunkSource).toContain("enc(");
    });
  });
});
