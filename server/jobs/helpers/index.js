// SPDX-License-Identifier: MIT
// Shim `Buffer.SlowBuffer` for Node ≥18. Required by `jsonwebtoken`
// (transitive dep via `buffer-equal-constant-time`) which crashes on
// require if the symbol is undefined. This helpers file is loaded by
// every Bree-spawned worker job, so installing the shim here covers all
// of them with a single point of change.
const { getStoragePath } = require("../../utils/paths");
require("../../utils/boot/patchSlowBuffer")();

const path = require("node:path");
const fs = require("node:fs");
const { parentPort } = require("node:worker_threads");
const documentsPath = getStoragePath("documents");

function log(stringContent = "") {
  if (parentPort)
    parentPort.postMessage(`\x1b[33m[${process.pid}]\x1b[0m: ${stringContent}`); // running as worker
  else
    process.send(
      `\x1b[33m[${process.ppid}:${process.pid}]\x1b[0m: ${stringContent}`,
    ); // running as child_process
}

function conclude() {
  if (parentPort) parentPort.postMessage("done");
  else process.exit(0);
}

function updateSourceDocument(docPath = null, jsonContent = {}) {
  const destinationFilePath = path.resolve(documentsPath, docPath);
  fs.writeFileSync(destinationFilePath, JSON.stringify(jsonContent, null, 4), {
    encoding: "utf-8",
  });
}

/**
 * Strips thought/thinking tags from text (e.g., <thinking>...</thinking>)
 * Useful for cleaning LLM responses before sending notifications.
 * @param {string} text - The text to strip thoughts from.
 * @returns {string} - The text with thought tags and their content removed.
 */
const THOUGHT_KEYWORDS = ["thought", "thinking", "think", "thought_chain"];
const THOUGHT_REGEX_COMPLETE = new RegExp(
  THOUGHT_KEYWORDS.map(
    (keyword) =>
      `<${keyword}\\s*(?:[^>]*?)?\\s*>[\\s\\S]*?<\\/${keyword}\\s*(?:[^>]*?)?>`,
  ).join("|"),
  "gi",
);

function stripThinkingFromText(text = "") {
  return text.replace(THOUGHT_REGEX_COMPLETE, "").trim();
}

module.exports = {
  log,
  conclude,
  updateSourceDocument,
  stripThinkingFromText,
};
