// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

// Tests for the RepoLoader resolver — the GitHub and GitLab loaders are
// mocked at the require() boundary so we only validate resolution behavior
// and argument forwarding.

const mockGithubRepoLoader = jest.fn();
const mockGitlabRepoLoader = jest.fn();
const mockLoadGithubRepo = jest.fn();
const mockLoadGitlabRepo = jest.fn();
const mockFetchGithubFile = jest.fn();
const mockFetchGitlabFile = jest.fn();

jest.mock(
  "../../../utils/extensions/RepoLoader/GithubRepo/RepoLoader",
  () => {
    const Cls = jest.fn().mockImplementation(function () {
      mockGithubRepoLoader();
      this.ready = true;
      this.author = "octocat";
      this.project = "hello-world";
      this.branch = "main";
      this.recursiveLoader = jest.fn(() =>
        Promise.resolve([
          { pageContent: "GH content", metadata: { source: "README.md" } },
        ])
      );
      this.fetchSingleFile = jest.fn(() => Promise.resolve("file content"));
    });
    return Cls;
  },
  { virtual: true }
);

jest.mock(
  "../../../utils/extensions/RepoLoader/GitlabRepo/RepoLoader",
  () => {
    const Cls = jest.fn().mockImplementation(function () {
      mockGitlabRepoLoader();
      this.ready = true;
      this.author = "alice";
      this.project = "my-project";
      this.projectId = "42";
      this.branch = "main";
      this.recursiveLoader = jest.fn(() =>
        Promise.resolve([
          { pageContent: "GL content", metadata: { source: "README.md" } },
        ])
      );
      this.fetchSingleFile = jest.fn(() => Promise.resolve("gl file content"));
    });
    return Cls;
  },
  { virtual: true }
);

jest.mock(
  "../../../utils/extensions/RepoLoader/GithubRepo",
  () => ({
    loadGithubRepo: mockLoadGithubRepo,
    fetchGithubFile: mockFetchGithubFile,
  }),
  { virtual: true }
);

jest.mock(
  "../../../utils/extensions/RepoLoader/GitlabRepo",
  () => ({
    loadGitlabRepo: mockLoadGitlabRepo,
    fetchGitlabFile: mockFetchGitlabFile,
  }),
  { virtual: true }
);

const {
  resolveRepoLoader,
  resolveRepoLoaderFunction,
} = require("../../../utils/extensions/RepoLoader");

describe("RepoLoader resolver", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("resolveRepoLoader", () => {
    it("returns the github class for 'github' platform", () => {
      const Cls = resolveRepoLoader("github");
      expect(Cls).toBeDefined();
      expect(typeof Cls).toBe("function");
    });

    it("returns the gitlab class for 'gitlab' platform", () => {
      const Cls = resolveRepoLoader("gitlab");
      expect(Cls).toBeDefined();
      expect(typeof Cls).toBe("function");
    });

    it("defaults to github for unknown platform", () => {
      const Cls = resolveRepoLoader("bitbucket");
      expect(Cls).toBeDefined();
      expect(typeof Cls).toBe("function");
    });

    it("defaults to github when no platform given", () => {
      const Cls = resolveRepoLoader();
      expect(Cls).toBeDefined();
      expect(typeof Cls).toBe("function");
    });

    it("returned class can be instantiated and used", () => {
      const Cls = resolveRepoLoader("github");
      const instance = new Cls({});
      expect(instance.author).toBe("octocat");
      expect(instance.project).toBe("hello-world");
    });
  });

  describe("resolveRepoLoaderFunction", () => {
    it("returns the github loader function for 'github'", () => {
      const fn = resolveRepoLoaderFunction("github");
      expect(fn).toBe(mockLoadGithubRepo);
    });

    it("returns the gitlab loader function for 'gitlab'", () => {
      const fn = resolveRepoLoaderFunction("gitlab");
      expect(fn).toBe(mockLoadGitlabRepo);
    });

    it("defaults to github loader for unknown platform", () => {
      const fn = resolveRepoLoaderFunction("unknown");
      expect(fn).toBe(mockLoadGithubRepo);
    });

    it("defaults to github loader when no platform given", () => {
      const fn = resolveRepoLoaderFunction();
      expect(fn).toBe(mockLoadGithubRepo);
    });
  });

  describe("loader function invocation (smoke)", () => {
    it("github load function is callable", async () => {
      const fn = resolveRepoLoaderFunction("github");
      await fn({ repoUrl: "https://github.com/x/y" }, { locals: {} });
      expect(mockLoadGithubRepo).toHaveBeenCalled();
    });

    it("gitlab load function is callable", async () => {
      const fn = resolveRepoLoaderFunction("gitlab");
      await fn({ repoUrl: "https://gitlab.com/x/y" }, { locals: {} });
      expect(mockLoadGitlabRepo).toHaveBeenCalled();
    });
  });
});
