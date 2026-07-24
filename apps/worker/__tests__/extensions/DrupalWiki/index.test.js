// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

// Tests for the DrupalWiki connector.
// Mocks the DrupalWiki class instance and the http utility.
// Note: the source does `const { DrupalWiki } = require("./DrupalWiki")`,
// so the mock must export a named `DrupalWiki` property that is a constructor.

jest.mock("../../../utils/http", () => ({
  validBaseUrl: jest.fn(() => true),
}));

const mockLoadAndStoreAllPagesForSpace = jest.fn(() => Promise.resolve());
const mockLoadPage = jest.fn();

jest.mock(
  "../../../utils/extensions/DrupalWiki/DrupalWiki",
  () => {
    return {
      DrupalWiki: jest.fn().mockImplementation(() => ({
        loadAndStoreAllPagesForSpace: mockLoadAndStoreAllPagesForSpace,
        loadPage: mockLoadPage,
        storagePath: "/fake/storage/drupalwiki",
      })),
    };
  },
  { virtual: true }
);

const { loadAndStoreSpaces, loadPage } = require("../../../utils/extensions/DrupalWiki");
const { validBaseUrl } = require("../../../utils/http");

const makeResponse = () => ({
  locals: {
    encryptionWorker: {
      encrypt: jest.fn((s) => `enc(${s})`),
    },
  },
});

describe("DrupalWiki.loadAndStoreSpaces", () => {
  beforeEach(() => {
    // resetAllMocks clears implementations AND queued mock*Once, unlike
    // clearAllMocks which only clears the call history.
    jest.clearAllMocks();
    validBaseUrl.mockReturnValue(true);
    mockLoadAndStoreAllPagesForSpace.mockResolvedValue(undefined);
    mockLoadPage.mockResolvedValue({ processedBody: "" });
  });

  describe("input validation", () => {
    it("rejects when baseUrl is missing", async () => {
      const res = await loadAndStoreSpaces(
        { spaceIds: "21", accessToken: "tok" },
        makeResponse()
      );
      expect(res.success).toBe(false);
      expect(res.reason).toMatch(/baseUrl/i);
    });

    it("rejects when baseUrl is not valid", async () => {
      validBaseUrl.mockReturnValue(false);
      const res = await loadAndStoreSpaces(
        { baseUrl: "not-a-url", spaceIds: "21", accessToken: "tok" },
        makeResponse()
      );
      expect(res.success).toBe(false);
      expect(res.reason).toMatch(/base URL/i);
    });

    it("rejects when spaceIds is missing", async () => {
      const res = await loadAndStoreSpaces(
        { baseUrl: "https://wiki.example.com", accessToken: "tok" },
        makeResponse()
      );
      expect(res.success).toBe(false);
      expect(res.reason).toMatch(/spaceIds/i);
    });

    it("rejects when accessToken is missing", async () => {
      const res = await loadAndStoreSpaces(
        { baseUrl: "https://wiki.example.com", spaceIds: "21" },
        makeResponse()
      );
      expect(res.success).toBe(false);
      expect(res.reason).toMatch(/API-Token/i);
    });
  });

  describe("successful load", () => {
    it("returns success and destination", async () => {
      const res = await loadAndStoreSpaces(
        {
          baseUrl: "https://wiki.example.com",
          spaceIds: "21,56",
          accessToken: "tok",
        },
        makeResponse()
      );
      expect(res.success).toBe(true);
      expect(res.reason).toBeNull();
      expect(res.data.spaceIds).toBe("21,56");
      expect(res.data.destination).toBe("/fake/storage/drupalwiki");
    });

    it("calls loadAndStoreAllPagesForSpace for each space", async () => {
      await loadAndStoreSpaces(
        {
          baseUrl: "https://wiki.example.com",
          spaceIds: "1,2,3",
          accessToken: "tok",
        },
        makeResponse()
      );
      expect(mockLoadAndStoreAllPagesForSpace).toHaveBeenCalledTimes(3);
      expect(mockLoadAndStoreAllPagesForSpace).toHaveBeenCalledWith(
        1,
        expect.anything()
      );
      expect(mockLoadAndStoreAllPagesForSpace).toHaveBeenCalledWith(
        3,
        expect.anything()
      );
    });

    it("trims whitespace around spaceIds", async () => {
      await loadAndStoreSpaces(
        {
          baseUrl: "https://wiki.example.com",
          spaceIds: "1, 2 , 3",
          accessToken: "tok",
        },
        makeResponse()
      );
      expect(mockLoadAndStoreAllPagesForSpace).toHaveBeenCalledWith(
        1,
        expect.anything()
      );
      expect(mockLoadAndStoreAllPagesForSpace).toHaveBeenCalledWith(
        2,
        expect.anything()
      );
      expect(mockLoadAndStoreAllPagesForSpace).toHaveBeenCalledWith(
        3,
        expect.anything()
      );
    });

    it("forwards the encryption worker from response.locals", async () => {
      const res = makeResponse();
      await loadAndStoreSpaces(
        { baseUrl: "https://wiki.example.com", spaceIds: "1", accessToken: "t" },
        res
      );
      expect(mockLoadAndStoreAllPagesForSpace).toHaveBeenCalledWith(
        1,
        res.locals.encryptionWorker
      );
    });
  });

  describe("error handling", () => {
    it("returns failure on first throwing space", async () => {
      mockLoadAndStoreAllPagesForSpace
        .mockRejectedValueOnce(new Error("Space failed"))
        .mockResolvedValueOnce(undefined);
      const res = await loadAndStoreSpaces(
        { baseUrl: "https://wiki.example.com", spaceIds: "1,2", accessToken: "t" },
        makeResponse()
      );
      expect(res.success).toBe(false);
      expect(res.reason).toBe("Space failed");
    });

    it("stops processing on first error", async () => {
      mockLoadAndStoreAllPagesForSpace.mockReset();
      mockLoadAndStoreAllPagesForSpace.mockRejectedValue(new Error("boom"));
      await loadAndStoreSpaces(
        { baseUrl: "https://wiki.example.com", spaceIds: "1,2,3", accessToken: "t" },
        makeResponse()
      );
      // Only the first space is attempted before bailing
      expect(mockLoadAndStoreAllPagesForSpace).toHaveBeenCalledTimes(1);
    });
  });
});

describe("DrupalWiki.loadPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validBaseUrl.mockReturnValue(true);
  });

  it("returns success and processed body", async () => {
    mockLoadPage.mockResolvedValue({
      processedBody: "Hello world",
      id: 42,
    });
    const res = await loadPage({
      baseUrl: "https://wiki.example.com",
      pageId: 42,
      accessToken: "tok",
    });
    expect(res.success).toBe(true);
    expect(res.reason).toBeNull();
    expect(res.content).toBe("Hello world");
  });

  it("returns failure when loader throws", async () => {
    mockLoadPage.mockRejectedValue(new Error("Not found"));
    const res = await loadPage({
      baseUrl: "https://wiki.example.com",
      pageId: 99,
      accessToken: "tok",
    });
    expect(res.success).toBe(false);
    expect(res.reason).toMatch(/Failed/);
    expect(res.content).toBeNull();
  });

  it("forwards pageId to DrupalWiki.loadPage", async () => {
    mockLoadPage.mockResolvedValue({ processedBody: "ok" });
    await loadPage({
      baseUrl: "https://wiki.example.com",
      pageId: 7,
      accessToken: "tok",
    });
    expect(mockLoadPage).toHaveBeenCalledWith(7);
  });
});
