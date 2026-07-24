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
const { fetchVideoTranscriptContent } = require("../../../utils/extensions/YoutubeTranscript");
const { fetchConfluencePage } = require("../../../utils/extensions/Confluence");
const { fetchGithubFile } = require("../../../utils/extensions/RepoLoader/GithubRepo");
const { loadPage } = require("../../../utils/extensions/DrupalWiki");
const { PaperlessNgxLoader } = require("../../../utils/extensions/PaperlessNgx/PaperlessNgxLoader");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeEncryptionWorker(throwOnExpand = false) {
  return {
    expandPayload: jest.fn(() => {
      if (throwOnExpand) throw new Error("payload expand failed");
      return new URL("https://example.com/x?baseUrl=b");
    }),
  };
}

function expectFailureEnvelope(statusMock, jsonMock) {
  expect(statusMock).toHaveBeenCalledWith(502);
  const lastJson = jsonMock.mock.calls[jsonMock.mock.calls.length - 1][0];
  expect(lastJson).toEqual(
    expect.objectContaining({
      success: false,
      content: null,
      error: "Resync failed",
      id: expect.stringMatching(UUID_RE),
    })
  );
}

describe("resync handlers - HTTP 502 error envelope (issue #254)", () => {
  let response;

  beforeEach(() => {
    jest.clearAllMocks();
    response = {
      status: jest.fn(() => response),
      json: jest.fn(),
      locals: { encryptionWorker: makeEncryptionWorker() },
    };
  });

  test("resyncLink returns 502 with error id when link fetcher throws", async () => {
    getLinkText.mockRejectedValue(new Error("network error"));
    await RESYNC_METHODS.link({ link: "https://example.com" }, response);
    expectFailureEnvelope(response.status, response.json);
  });

  test("resyncLink returns 502 when getLinkText reports failure", async () => {
    getLinkText.mockResolvedValue({ success: false, reason: "timeout" });
    await RESYNC_METHODS.link({ link: "https://example.com" }, response);
    expectFailureEnvelope(response.status, response.json);
  });

  test("resyncYouTube returns 502 when transcript fetcher throws", async () => {
    fetchVideoTranscriptContent.mockRejectedValue(new Error("yt api down"));
    await RESYNC_METHODS.youtube({ link: "https://youtube.com/x" }, response);
    expectFailureEnvelope(response.status, response.json);
  });

  test("resyncYouTube returns 502 when transcript reports failure", async () => {
    fetchVideoTranscriptContent.mockResolvedValue({ success: false });
    await RESYNC_METHODS.youtube({ link: "https://youtube.com/x" }, response);
    expectFailureEnvelope(response.status, response.json);
  });

  test("resyncConfluence returns 502 when encryptionWorker is missing", async () => {
    response.locals = {};
    await RESYNC_METHODS.confluence({ chunkSource: "x" }, response);
    expectFailureEnvelope(response.status, response.json);
  });

  test("resyncConfluence returns 502 when fetchConfluencePage throws", async () => {
    fetchConfluencePage.mockRejectedValue(new Error("confluence 500"));
    await RESYNC_METHODS.confluence({ chunkSource: "x" }, response);
    expectFailureEnvelope(response.status, response.json);
  });

  test("resyncGithub returns 502 when encryptionWorker is missing", async () => {
    response.locals = {};
    await RESYNC_METHODS.github({ chunkSource: "x" }, response);
    expectFailureEnvelope(response.status, response.json);
  });

  test("resyncGithub returns 502 when fetchGithubFile throws", async () => {
    fetchGithubFile.mockRejectedValue(new Error("github 502"));
    await RESYNC_METHODS.github({ chunkSource: "x" }, response);
    expectFailureEnvelope(response.status, response.json);
  });

  test("resyncDrupalWiki returns 502 when loadPage reports failure", async () => {
    loadPage.mockResolvedValue({ success: false, reason: "missing" });
    await RESYNC_METHODS.drupalwiki({ chunkSource: "x" }, response);
    expectFailureEnvelope(response.status, response.json);
  });

  test("resyncDrupalWiki returns 502 when loadPage throws", async () => {
    loadPage.mockRejectedValue(new Error("drupal timeout"));
    await RESYNC_METHODS.drupalwiki({ chunkSource: "x" }, response);
    expectFailureEnvelope(response.status, response.json);
  });

  test("resyncPaperlessNgx returns 502 when loader throws", async () => {
    PaperlessNgxLoader.mockImplementation(() => ({
      fetchDocumentContent: jest.fn().mockRejectedValue(new Error("prplx 502")),
    }));
    await RESYNC_METHODS["paperless-ngx"]({ chunkSource: "x" }, response);
    expectFailureEnvelope(response.status, response.json);
  });

  test("resyncPaperlessNgx returns 502 when content is null", async () => {
    PaperlessNgxLoader.mockImplementation(() => ({
      fetchDocumentContent: jest.fn().mockResolvedValue(null),
    }));
    await RESYNC_METHODS["paperless-ngx"]({ chunkSource: "x" }, response);
    expectFailureEnvelope(response.status, response.json);
  });
});
