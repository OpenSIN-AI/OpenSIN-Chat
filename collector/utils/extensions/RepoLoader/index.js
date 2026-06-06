/**
 * Dynamically load the correct repository loader from a specific platform
 * by default will return GitHub.
 * @param {('github'|'gitlab')} platform
 * @returns {import("./GithubRepo/RepoLoader")|import("./GitlabRepo/RepoLoader")} the repo loader class for provider
 */
function resolveRepoLoader(platform = "github") {
  switch (platform) {
    case "github":
      // eslint-disable-next-line no-console
      console.log(`Loading GitHub RepoLoader...`);
      return require("./GithubRepo/RepoLoader");
    case "gitlab":
      // eslint-disable-next-line no-console
      console.log(`Loading GitLab RepoLoader...`);
      return require("./GitlabRepo/RepoLoader");
    default:
      // eslint-disable-next-line no-console
      console.log(`Loading GitHub RepoLoader...`);
      return require("./GithubRepo/RepoLoader");
  }
}

/**
 * Dynamically load the correct repository loader function from a specific platform
 * by default will return Github.
 * @param {('github'|'gitlab')} platform
 * @returns {import("./GithubRepo")['fetchGithubFile'] | import("./GitlabRepo")['fetchGitlabFile']} the repo loader class for provider
 */
function resolveRepoLoaderFunction(platform = "github") {
  switch (platform) {
    case "github":
      // eslint-disable-next-line no-console
      console.log(`Loading GitHub loader function...`);
      return require("./GithubRepo").loadGithubRepo;
    case "gitlab":
      // eslint-disable-next-line no-console
      console.log(`Loading GitLab loader function...`);
      return require("./GitlabRepo").loadGitlabRepo;
    default:
      // eslint-disable-next-line no-console
      console.log(`Loading GitHub loader function...`);
      return require("./GithubRepo").loadGithubRepo;
  }
}

module.exports = { resolveRepoLoader, resolveRepoLoaderFunction };
