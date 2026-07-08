// SPDX-License-Identifier: MIT
// Purpose: Shared helpers for document API endpoints.
// Extracted from document/index.js as part of issue #510 God-File split.

const fs = require("fs");
const { reqBody } = require("../../../utils/http");

/**
 * Runs a simple validation check on the addToWorkspaces query parameter to ensure it is a string of comma-separated workspace slugs.
 * @param {*} request
 * @param {*} response
 * @param {*} next
 * @returns
 */
function validateWorkspaceSlugQuery(request, response, next) {
  const { addToWorkspaces = "" } = reqBody(request);
  if (!addToWorkspaces) return next();
  if (typeof addToWorkspaces !== "string") {
    return response
      .status(422)
      .json({
        success: false,
        error: `addToWorkspaces must be a string of comma-separated workspace slugs. Got ${typeof addToWorkspaces}`,
      })
      .end();
  }
  next();
}

/**
 * Best-effort cleanup of a file left in the collector hotdir after processing.
 * @param {*} request
 */
async function cleanupHotdirFile(request) {
  try {
    const filePath = request.file?.path;
    if (!filePath) return;
    await fs.promises.access(filePath);
    await fs.promises.rm(filePath, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup
  }
}

module.exports = {
  validateWorkspaceSlugQuery,
  cleanupHotdirFile,
};
