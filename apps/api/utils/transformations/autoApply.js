// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");
const { Transformation } = require("../../models/transformation");
const { Document } = require("../../models/documents");
const { runTransformation } = require("./index");

/**
 * Applies all transformations with applyDefault=true to newly uploaded
 * documents.  Runs sequentially to avoid hammering LLM rate limits.
 * Designed to be called fire-and-forget after a successful document upload.
 *
 * @param {object} params
 * @param {object} params.workspace
 * @param {string[]} params.docPaths - docpath values of the new documents
 */
async function applyDefaultTransformations({ workspace, docPaths = [] }) {
  if (!workspace || docPaths.length === 0) return;

  const all = await Transformation.all();
  const defaults = all.filter((t) => t.applyDefault);
  if (defaults.length === 0) return;

  for (const docPath of docPaths) {
    const document = await Document.get({
      workspaceId: Number(workspace.id),
      docpath: docPath,
    });
    if (!document) continue;

    for (const transformation of defaults) {
      try {
        await runTransformation({ transformation, document, workspace });
        consoleLogger.log(
          `[Transformations] Auto-applied "${transformation.name}" to ${document.filename}`,
        );
      } catch (e) {
        consoleLogger.error(
          `[Transformations] Auto-apply "${transformation.name}" on ${docPath}: ${e.message}`,
        );
      }
    }
  }
}

module.exports = { applyDefaultTransformations };
