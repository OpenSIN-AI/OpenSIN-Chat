// SPDX-License-Identifier: MIT
const ignore = require("ignore");

const MAX_REPOSITORY_FILE_BYTES = 1024 * 1024;
const BINARY_EXTENSIONS = new Set([
  "7z",
  "avi",
  "bin",
  "bmp",
  "class",
  "dll",
  "dmg",
  "doc",
  "docx",
  "eot",
  "exe",
  "gif",
  "gz",
  "ico",
  "jar",
  "jpeg",
  "jpg",
  "mov",
  "mp3",
  "mp4",
  "otf",
  "pdf",
  "png",
  "ppt",
  "pptx",
  "so",
  "tar",
  "ttf",
  "wav",
  "webm",
  "webp",
  "woff",
  "woff2",
  "xls",
  "xlsx",
  "zip",
]);

/**
 * @typedef {Object} RepoLoaderArgs
 * @property {string} repo - The GitHub repository URL.
 * @property {string} [branch] - The branch to load from (optional).
 * @property {string} [accessToken] - GitHub access token for authentication (optional).
 * @property {string[]} [ignorePaths] - Array of paths to ignore when loading (optional).
 */

/**
 * @class
 * @classdesc Loads and manages GitHub repository content.
 */
class GitHubRepoLoader {
  /**
   * Creates an instance of RepoLoader.
   * @param {RepoLoaderArgs} [args] - The configuration options.
   * @returns {GitHubRepoLoader}
   */
  constructor(args = {}) {
    this.ready = false;
    this.repo = this.#processRepoUrl(args?.repo);
    this.branch = args?.branch;
    this.accessToken = args?.accessToken || null;
    this.ignorePaths = args?.ignorePaths || [];
    this.maxRetries = 3;

    this.author = null;
    this.project = null;
    this.branches = [];
  }

  #wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Processes a repository URL to ensure it is in the correct format
   * - remove the .git suffix if present
   * - ensure the url is valid
   * @param {string} repoUrl - The repository URL to process.
   * @returns {string|null} The processed repository URL, or null if the URL is invalid.
   */
  #processRepoUrl(repoUrl) {
    if (!repoUrl) return repoUrl;
    try {
      const url = new URL(repoUrl);
      if (url.pathname.endsWith(".git"))
        url.pathname = url.pathname.slice(0, -4);
      return url.toString();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        `[GitHub Loader]: Error processing repository URL ${this.repo}: ${e.message}`,
      );
      return repoUrl;
    }
  }

  /**
   * Validates the GitHub URL format.
   * - ensure the url is valid
   * - ensure the hostname is github.com
   * - ensure the pathname is in the format of github.com/{author}/{project}
   * - sets the author and project properties of class instance
   * @returns {boolean} True if the URL is valid, false otherwise.
   */
  #validGithubUrl() {
    try {
      const url = new URL(this.repo);

      // Not a github url at all.
      if (url.hostname !== "github.com") {
        // eslint-disable-next-line no-console
        console.log(
          `[GitHub Loader]: Invalid GitHub URL provided! Hostname must be 'github.com'. Got ${url.hostname}`,
        );
        return false;
      }

      // Assume the url is in the format of github.com/{author}/{project}
      // Remove the first slash from the pathname so we can split it properly.
      const [author, project, ..._rest] = url.pathname.slice(1).split("/");
      if (!author || !project) {
        // eslint-disable-next-line no-console
        console.log(
          `[GitHub Loader]: Invalid GitHub URL provided! URL must be in the format of 'github.com/{author}/{project}'. Got ${url.pathname}`,
        );
        return false;
      }

      this.author = author;
      this.project = project;
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(
        `[GitHub Loader]: Invalid GitHub URL provided! Error: ${e.message}`,
      );
      return false;
    }
  }

  // Ensure the branch provided actually exists
  // and if it does not or has not been set auto-assign to primary branch.
  async #validBranch() {
    await this.getRepoBranches();
    if (!!this.branch && this.branches.includes(this.branch)) return;

    // eslint-disable-next-line no-console
    console.log(
      "[GitHub Loader]: Branch not set! Auto-assigning to a default branch.",
    );
    if (this.branches.length === 0) {
      this.branch = "main";
    } else {
      this.branch = this.branches.includes("main") ? "main" : this.branches[0];
    }
    // eslint-disable-next-line no-console
    console.log(`[GitHub Loader]: Branch auto-assigned to ${this.branch}.`);
    return;
  }

  async #validateAccessToken() {
    if (!this.accessToken) return;
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 10_000);
    const valid = await fetch("https://api.github.com/octocat", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: abortController.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.ok;
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(
          "Invalid GitHub Access Token provided! Access token will not be used",
          e.message,
        );
        return false;
      })
      .finally(() => clearTimeout(timeout));

    if (!valid) this.accessToken = null;
    return;
  }

  /**
   * Initializes the RepoLoader instance.
   * @returns {Promise<RepoLoader>} The initialized RepoLoader instance.
   */
  async init() {
    if (!this.#validGithubUrl()) return;
    await this.#validBranch();
    await this.#validateAccessToken();
    this.ready = true;
    return this;
  }

  /**
   * Recursively loads the repository content.
   * @returns {Promise<Array<Object>>} An array of loaded documents.
   * @throws {Error} If the RepoLoader is not in a ready state.
   */
  async recursiveLoader() {
    if (!this.ready) throw new Error("[GitHub Loader]: not in ready state!");

    const treeAbort = new AbortController();
    const treeTimeout = setTimeout(() => treeAbort.abort(), 20_000);
    let tree;
    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.author}/${this.project}/git/trees/${encodeURIComponent(this.branch)}?recursive=1`,
        {
          headers: this.#githubHeaders(),
          signal: treeAbort.signal,
        },
      );
      if (!response.ok)
        throw new Error(
          `Failed to fetch repository tree: ${response.status} ${response.statusText}`,
        );
      const payload = await response.json();
      if (payload.truncated)
        throw new Error(
          "Repository tree is too large for a complete GitHub API response.",
        );
      tree = Array.isArray(payload.tree) ? payload.tree : [];
    } finally {
      clearTimeout(treeTimeout);
    }

    const ignoreMatcher = ignore().add(this.ignorePaths);
    const maxFiles = this.accessToken ? 1000 : 50;
    const files = tree
      .filter((entry) => entry.type === "blob" && entry.size > 0)
      .filter((entry) => entry.size <= MAX_REPOSITORY_FILE_BYTES)
      .filter((entry) => !ignoreMatcher.ignores(entry.path))
      .filter((entry) => {
        const extension = entry.path.split(".").pop()?.toLowerCase();
        return !extension || !BINARY_EXTENSIONS.has(extension);
      })
      .slice(0, maxFiles);

    if (files.length === maxFiles) {
      // eslint-disable-next-line no-console
      console.warn(
        `[GitHub Loader]: Limited repository import to ${maxFiles} text files${this.accessToken ? "" : " without an access token"}.`,
      );
    }

    const documents = [];
    for (let offset = 0; offset < files.length; offset += 5) {
      const batch = files.slice(offset, offset + 5);
      const results = await Promise.all(
        batch.map((file) => this.#fetchBlobDocument(file)),
      );
      documents.push(...results.filter(Boolean));
    }
    return documents;
  }

  #githubHeaders() {
    return {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(this.accessToken
        ? { Authorization: `Bearer ${this.accessToken}` }
        : {}),
    };
  }

  async #fetchBlobDocument(file) {
    const blobAbort = new AbortController();
    const blobTimeout = setTimeout(() => blobAbort.abort(), 15_000);
    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.author}/${this.project}/git/blobs/${file.sha}`,
        {
          headers: this.#githubHeaders(),
          signal: blobAbort.signal,
        },
      );
      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.warn(
          `[GitHub Loader]: Failed to fetch ${file.path}: ${response.status}`,
        );
        return null;
      }
      const payload = await response.json();
      if (payload.encoding !== "base64" || !payload.content) return null;
      const content = Buffer.from(
        payload.content.replace(/\s/g, ""),
        "base64",
      ).toString("utf8");
      if (!content || content.includes("\u0000")) return null;
      return {
        pageContent: content,
        metadata: {
          source: file.path,
          repository: `https://github.com/${this.author}/${this.project}`,
          branch: this.branch,
        },
      };
    } finally {
      clearTimeout(blobTimeout);
    }
  }

  // Sort branches to always show either main or master at the top of the result.
  #branchPrefSort(branches = []) {
    const preferredSort = ["main", "master"];
    return branches.reduce((acc, branch) => {
      if (preferredSort.includes(branch)) return [branch, ...acc];
      return [...acc, branch];
    }, []);
  }

  /**
   * Retrieves all branches for the repository.
   * @returns {Promise<string[]>} An array of branch names.
   */
  async getRepoBranches() {
    if (!this.#validGithubUrl() || !this.author || !this.project) return [];
    await this.#validateAccessToken(); // Ensure API access token is valid for pre-flight

    let page = 1;
    let polling = true;
    const branches = [];

    while (polling) {
      // eslint-disable-next-line no-console
      console.log(`Fetching page ${page} of branches for ${this.project}`);
      let retries = 0;
      let success = false;
      while (!success && retries <= this.maxRetries) {
        const branchAbort = new AbortController();
        const branchTimeout = setTimeout(() => branchAbort.abort(), 10_000);
        try {
          const res = await fetch(
            `https://api.github.com/repos/${this.author}/${this.project}/branches?per_page=100&page=${page}`,
            {
              method: "GET",
              headers: {
                ...(this.accessToken
                  ? { Authorization: `Bearer ${this.accessToken}` }
                  : {}),
                "X-GitHub-Api-Version": "2022-11-28",
              },
              signal: branchAbort.signal,
            },
          );

          if (res.status === 429 && retries < this.maxRetries) {
            const retryAfter = Number(res.headers.get("retry-after")) || 60;
            // eslint-disable-next-line no-console
            console.warn(
              `[GitHub Loader]: Rate limit (429) for branches page ${page}. Waiting ${retryAfter}s…`,
            );
            clearTimeout(branchTimeout);
            await this.#wait(retryAfter * 1000);
            retries++;
            continue;
          }

          if (!res.ok)
            throw new Error(`Invalid request to Github API: ${res.statusText}`);

          const branchObjects = await res.json();
          polling = branchObjects.length > 0;
          branches.push(branchObjects.map((branch) => branch.name));
          page++;
          success = true;
        } catch (err) {
          polling = false;
          // eslint-disable-next-line no-console
          console.error(`RepoLoader.branches`, err);
          break;
        } finally {
          clearTimeout(branchTimeout);
        }
      }
      if (!success) {
        polling = false;
      }
    }

    this.branches = [...new Set(branches.flat())];
    return this.#branchPrefSort(this.branches);
  }

  /**
   * Fetches the content of a single file from the repository.
   * @param {string} sourceFilePath - The path to the file in the repository.
   * @returns {Promise<string|null>} The content of the file, or null if fetching fails.
   */
  async fetchSingleFile(sourceFilePath, retries = 0) {
    const fileAbort = new AbortController();
    const fileTimeout = setTimeout(() => fileAbort.abort(), 15_000);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${this.author}/${this.project}/contents/${sourceFilePath}?ref=${this.branch}`,
        {
          method: "GET",
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(!!this.accessToken
              ? { Authorization: `Bearer ${this.accessToken}` }
              : {}),
          },
          signal: fileAbort.signal,
        },
      );

      if (res.status === 429 && retries < this.maxRetries) {
        const retryAfter = Number(res.headers.get("retry-after")) || 60;
        // eslint-disable-next-line no-console
        console.warn(
          `[GitHub Loader]: Rate limit (429) for ${sourceFilePath}. Waiting ${retryAfter}s…`,
        );
        clearTimeout(fileTimeout);
        await this.#wait(retryAfter * 1000);
        return this.fetchSingleFile(sourceFilePath, retries + 1);
      }

      if (!res.ok)
        throw new Error(`Failed to fetch from Github API: ${res.statusText}`);

      const json = await res.json();
      if (json.hasOwnProperty("status") || !json.hasOwnProperty("content"))
        throw new Error(json?.message || "missing content");
      return Buffer.from(json.content, "base64").toString("utf8");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`RepoLoader.fetchSingleFile`, e);
      return null;
    } finally {
      clearTimeout(fileTimeout);
    }
  }
}

module.exports = GitHubRepoLoader;
