// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

jest.mock("../../middleware/setDataSigner", () => ({
  setDataSigner: jest.fn((req, res, next) => next()),
}));

jest.mock("../../middleware/verifyIntegrity", () => ({
  verifyPayloadIntegrity: jest.fn((req, res, next) => next()),
}));

jest.mock("../../utils/extensions/RepoLoader", () => ({
  resolveRepoLoader: jest.fn(),
  resolveRepoLoaderFunction: jest.fn(),
}));

jest.mock("../../utils/http", () => ({
  reqBody: jest.fn((req) => req.body),
}));

jest.mock("../../utils/url", () => ({
  validURL: jest.fn(() => true),
  validateURL: jest.fn((u) => u),
}));

jest.mock("../../extensions/resync", () => ({
  link: jest.fn(),
  youtube: jest.fn(),
  confluence: jest.fn(),
  github: jest.fn(),
  drupalwiki: jest.fn(),
  "paperless-ngx": jest.fn(),
}));

jest.mock("../../utils/extensions/ObsidianVault", () => ({
  loadObsidianVault: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock("../../utils/extensions/WebsiteDepth", () => jest.fn(() =>
  Promise.resolve([{ url: "https://example.com", content: "text" }])
), { virtual: true });

jest.mock("../../utils/extensions/YoutubeTranscript", () => ({
  loadYouTubeTranscript: jest.fn(() =>
    Promise.resolve({ success: true, reason: null, data: {} })
  ),
}), { virtual: true });

jest.mock("../../utils/extensions/Confluence", () => ({
  loadConfluence: jest.fn(() =>
    Promise.resolve({ success: true, reason: null, data: {} })
  ),
}), { virtual: true });

jest.mock("../../utils/extensions/DrupalWiki", () => ({
  loadAndStoreSpaces: jest.fn(() =>
    Promise.resolve({ success: true, reason: null, data: {} })
  ),
}), { virtual: true });

jest.mock("../../utils/extensions/PaperlessNgx", () => ({
  loadPaperlessNgx: jest.fn(() =>
    Promise.resolve({ success: true, reason: null, data: {} })
  ),
}), { virtual: true });

jest.mock("dotenv", () => ({
  config: jest.fn(),
}), { virtual: true });

const extensions = require("../../extensions");
const { reqBody } = require("../../utils/http");
const { validURL, validateURL } = require("../../utils/url");
const RESYNC_METHODS = require("../../extensions/resync");
const { resolveRepoLoaderFunction } = require("../../utils/extensions/RepoLoader");

describe("extensions", () => {
  let app;
  let routes;

  beforeEach(() => {
    jest.clearAllMocks();
    routes = {};
    app = {
      post: jest.fn((path, ...handlers) => {
        routes[path] = handlers;
      }),
    };
  });

  it("does nothing when app is not provided", () => {
    expect(() => extensions(null)).not.toThrow();
    expect(() => extensions(undefined)).not.toThrow();
  });

  it("registers POST routes on the app", () => {
    extensions(app);
    expect(app.post).toHaveBeenCalled();
    const registeredPaths = app.post.mock.calls.map((call) => call[0]);
    expect(registeredPaths).toContain("/ext/resync-source-document");
  });

  describe("route: /ext/resync-source-document", () => {
    it("calls the correct resync method based on type", async () => {
      extensions(app);
      const handlers = routes["/ext/resync-source-document"];
      const handler = handlers[handlers.length - 1];

      const req = {};
      const res = { status: jest.fn(() => res), json: jest.fn() };

      reqBody.mockReturnValue({ type: "link", options: { link: "https://example.com" } });
      RESYNC_METHODS.link.mockResolvedValue({ success: true, content: "text" });

      await handler(req, res);
      expect(RESYNC_METHODS.link).toHaveBeenCalledWith(
        { link: "https://example.com" },
        res
      );
    });

    it("returns error for unknown resync type", async () => {
      extensions(app);
      const handlers = routes["/ext/resync-source-document"];
      const handler = handlers[handlers.length - 1];

      const req = {};
      const res = { status: jest.fn(() => res), json: jest.fn() };

      reqBody.mockReturnValue({ type: "unknown_type", options: {} });

      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("route: /ext/:repo_platform-repo", () => {
    it("calls resolveRepoLoaderFunction with platform", async () => {
      extensions(app);
      const repoRoute = Object.keys(routes).find((r) =>
        r.includes("repo_platform")
      );
      const handler = routes[repoRoute][routes[repoRoute].length - 1];

      const mockLoadRepo = jest.fn(() =>
        Promise.resolve({ success: true, reason: null, data: {} })
      );
      resolveRepoLoaderFunction.mockReturnValue(mockLoadRepo);

      const req = { params: { repo_platform: "github" }, body: {} };
      const res = { status: jest.fn(() => res), json: jest.fn() };
      reqBody.mockReturnValue({ repoUrl: "https://github.com/repo" });

      await handler(req, res);
      expect(resolveRepoLoaderFunction).toHaveBeenCalledWith("github");
      expect(mockLoadRepo).toHaveBeenCalled();
    });

    it("handles errors from repo loader", async () => {
      extensions(app);
      const repoRoute = Object.keys(routes).find((r) =>
        r.includes("repo_platform")
      );
      const handler = routes[repoRoute][routes[repoRoute].length - 1];

      resolveRepoLoaderFunction.mockImplementation(() => {
        throw new Error("Loader not found");
      });

      const req = { params: { repo_platform: "unknown" }, body: {} };
      const res = { status: jest.fn(() => res), json: jest.fn() };
      reqBody.mockReturnValue({});

      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("route: /ext/website-depth", () => {
    it("validates URL for website-depth", async () => {
      extensions(app);
      const handlers = routes["/ext/website-depth"];
      const handler = handlers[handlers.length - 1];

      const req = {};
      const res = { status: jest.fn(() => res), json: jest.fn() };
      reqBody.mockReturnValue({ url: "https://example.com", depth: 1, maxLinks: 5 });
      validateURL.mockReturnValue("https://example.com");
      validURL.mockReturnValue(true);

      await handler(req, res);
      expect(validateURL).toHaveBeenCalledWith("https://example.com");
    });

    it("returns error for invalid URL", async () => {
      extensions(app);
      const handlers = routes["/ext/website-depth"];
      const handler = handlers[handlers.length - 1];

      const req = {};
      const res = { status: jest.fn(() => res), json: jest.fn() };
      reqBody.mockReturnValue({ url: "not-a-url" });
      validateURL.mockReturnValue("not-a-url");
      validURL.mockReturnValue(false);

      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
