// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

jest.mock("../../../processLink", () => ({
  getLinkText: jest.fn(),
}));

jest.mock("../../../utils/extensions/YoutubeTranscript", () => ({
  fetchVideoTranscriptContent: jest.fn(),
}), { virtual: true });

jest.mock("../../../utils/extensions/Confluence", () => ({
  fetchConfluencePage: jest.fn(),
}), { virtual: true });

jest.mock("../../../utils/extensions/RepoLoader/GithubRepo", () => ({
  fetchGithubFile: jest.fn(),
}), { virtual: true });

jest.mock("../../../utils/extensions/DrupalWiki", () => ({
  loadPage: jest.fn(),
}), { virtual: true });

jest.mock("../../../utils/extensions/PaperlessNgx/PaperlessNgxLoader", () => ({
  PaperlessNgxLoader: jest.fn(),
}), { virtual: true });

const RESYNC_METHODS = require("../../../extensions/resync");
const { getLinkText } = require("../../../processLink");

describe("resync methods", () => {
  let response;

  beforeEach(() => {
    jest.clearAllMocks();
    response = {
      status: jest.fn(() => response),
      json: jest.fn(),
      locals: {},
    };
  });

  describe("resyncLink", () => {
    it("throws when no link provided", async () => {
      await expect(
        RESYNC_METHODS.link({}, response)
      ).rejects.toThrow("Invalid link provided");
    });

    it("returns content on successful link fetch", async () => {
      getLinkText.mockResolvedValue({ success: true, content: "page text" });
      await RESYNC_METHODS.link({ link: "https://example.com" }, response);
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        success: true,
        content: "page text",
      });
    });

    it("returns failure when getLinkText fails", async () => {
      getLinkText.mockResolvedValue({
        success: false,
        reason: "timeout",
        content: null,
      });
      await RESYNC_METHODS.link({ link: "https://bad.url" }, response);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("handles exceptions gracefully", async () => {
      getLinkText.mockRejectedValue(new Error("network error"));
      await RESYNC_METHODS.link({ link: "https://example.com" }, response);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          content: null,
          error: "Resync failed",
          id: expect.any(String),
        })
      );
    });

    it("returns HTTP 502 with error id on link fetch failure", async () => {
      getLinkText.mockRejectedValue(new Error("network error"));
      await RESYNC_METHODS.link({ link: "https://example.com" }, response);
      expect(response.status).toHaveBeenCalledWith(502);
      const lastJson =
        response.json.mock.calls[response.json.mock.calls.length - 1][0];
      expect(lastJson).toHaveProperty("error", "Resync failed");
      expect(lastJson.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe("resyncYouTube", () => {
    it("throws when no link provided", async () => {
      await expect(
        RESYNC_METHODS.youtube({}, response)
      ).rejects.toThrow("Invalid link provided");
    });

    it("returns failure for null link", async () => {
      await expect(
        RESYNC_METHODS.youtube({ link: null }, response)
      ).rejects.toThrow();
    });
  });

  describe("resyncConfluence", () => {
    it("throws when no chunkSource provided", async () => {
      await expect(
        RESYNC_METHODS.confluence({}, response)
      ).rejects.toThrow("Invalid source property provided");
    });

    it("returns failure when encryptionWorker is missing", async () => {
      response.locals = {};
      await RESYNC_METHODS.confluence({ chunkSource: "some-source" }, response);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("resyncGithub", () => {
    it("throws when no chunkSource provided", async () => {
      await expect(
        RESYNC_METHODS.github({}, response)
      ).rejects.toThrow("Invalid source property provided");
    });

    it("returns failure when encryptionWorker is missing", async () => {
      response.locals = {};
      await RESYNC_METHODS.github({ chunkSource: "some-source" }, response);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("resyncDrupalWiki", () => {
    it("throws when no chunkSource provided", async () => {
      await expect(
        RESYNC_METHODS.drupalwiki({}, response)
      ).rejects.toThrow("Invalid source property provided");
    });

    it("returns failure when encryptionWorker is missing", async () => {
      response.locals = {};
      await RESYNC_METHODS.drupalwiki({ chunkSource: "some-source" }, response);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("resyncPaperlessNgx", () => {
    it("throws when no chunkSource provided", async () => {
      await expect(
        RESYNC_METHODS["paperless-ngx"]({}, response)
      ).rejects.toThrow("Invalid source property provided");
    });

    it("returns failure when encryptionWorker is missing", async () => {
      response.locals = {};
      await RESYNC_METHODS["paperless-ngx"]({ chunkSource: "some-source" }, response);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  it("exports all expected resync methods", () => {
    expect(RESYNC_METHODS).toHaveProperty("link");
    expect(RESYNC_METHODS).toHaveProperty("youtube");
    expect(RESYNC_METHODS).toHaveProperty("confluence");
    expect(RESYNC_METHODS).toHaveProperty("github");
    expect(RESYNC_METHODS).toHaveProperty("drupalwiki");
    expect(RESYNC_METHODS).toHaveProperty("paperless-ngx");
  });
});
