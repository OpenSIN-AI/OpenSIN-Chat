// SPDX-License-Identifier: MIT
// Middleware to validate that a repo provider URL is supported.
const REPO_PLATFORMS = ["github", "gitlab"];

function isSupportedRepoProvider(request, response, next) {
  const { repo_platform = null } = request.params;
  if (!repo_platform || !REPO_PLATFORMS.includes(repo_platform))
    return response.status(400).json({
      error: "Unsupported repo platform.",
    });
  next();
}
module.exports = { isSupportedRepoProvider };
