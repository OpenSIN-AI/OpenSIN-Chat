// SPDX-License-Identifier: MIT
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

    this.author = null;
    this.project = null;
    this.branches = [];
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
        `[GitHub Loader]: Error processing repository URL ${this.repo}: ${e.message}`
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
          `[GitHub Loader]: Invalid GitHub URL provided! Hostname must be 'github.com'. Got ${url.hostname}`
        );
        return false;
      }

      // Assume the url is in the format of github.com/{author}/{project}
      // Remove the first slash from the pathname so we can split it properly.
      const [author, project, ..._rest] = url.pathname.slice(1).split("/");
      if (!author || !project) {
        // eslint-disable-next-line no-console
        console.log(
          `[GitHub Loader]: Invalid GitHub URL provided! URL must be in the format of 'github.com/{author}/{project}'. Got ${url.pathname}`
        );
        return false;
      }

      this.author = author;
      this.project = project;
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(
        `[GitHub Loader]: Invalid GitHub URL provided! Error: ${e.message}`
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
      "[GitHub Loader]: Branch not set! Auto-assigning to a default branch."
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
          e.message
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
    const {
      GithubRepoLoader: LCGithubLoader,
    } = require("@langchain/community/document_loaders/web/github");

    if (this.accessToken)
      // eslint-disable-next-line no-console
      console.log(
        `[GitHub Loader]: Access token set! Recursive loading enabled!`
      );

    const loader = new LCGithubLoader(this.repo, {
      branch: this.branch,
      recursive: !!this.accessToken, // Recursive will hit rate limits.
      maxConcurrency: 5,
      unknown: "warn",
      accessToken: this.accessToken,
      ignorePaths: this.ignorePaths,
      verbose: true,
    });

    const docs = await loader.load();
    return docs;
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

    let page = 0;
    let polling = true;
    const branches = [];

    while (polling) {
      // eslint-disable-next-line no-console
      console.log(`Fetching page ${page} of branches for ${this.project}`);
      const branchAbort = new AbortController();
      const branchTimeout = setTimeout(() => branchAbort.abort(), 10_000);
      await fetch(
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
        }
      )
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error(`Invalid request to Github API: ${res.statusText}`);
        })
        .then((branchObjects) => {
          polling = branchObjects.length > 0;
          branches.push(branchObjects.map((branch) => branch.name));
          page++;
        })
        .catch((err) => {
          polling = false;
          // eslint-disable-next-line no-console
          console.error(`RepoLoader.branches`, err);
        })
        .finally(() => clearTimeout(branchTimeout));
    }

    this.branches = [...new Set(branches.flat())];
    return this.#branchPrefSort(this.branches);
  }

  /**
   * Fetches the content of a single file from the repository.
   * @param {string} sourceFilePath - The path to the file in the repository.
   * @returns {Promise<string|null>} The content of the file, or null if fetching fails.
   */
  async fetchSingleFile(sourceFilePath) {
    const fileAbort = new AbortController();
    const fileTimeout = setTimeout(() => fileAbort.abort(), 15_000);
    try {
      return await fetch(
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
        }
      )
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error(`Failed to fetch from Github API: ${res.statusText}`);
        })
        .then((json) => {
          if (json.hasOwnProperty("status") || !json.hasOwnProperty("content"))
            throw new Error(json?.message || "missing content");
          return atob(json.content);
        });
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
