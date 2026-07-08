// SPDX-License-Identifier: MIT
// Utility functions for AIbitat.
// Split from index.js as part of issue #528 — God-File reduction.

const TOOL_OUTPUT_MAX_BYTES =
  parseInt(process.env.AGENT_TOOL_OUTPUT_MAX_BYTES, 10) || 8192;

/**
 * Sanitizes a tool result for consumption by the LLM.
 * Strips ANSI escape sequences, truncates to TOOL_OUTPUT_MAX_BYTES,
 * and wraps in <tool_output> tags.
 * @param {*} result - The tool result to sanitize
 * @returns {string} The sanitized tool output string
 */
function sanitizeToolResultForLLM(result) {
  const text =
    typeof result === "string"
      ? result
      : result === undefined || result === null
        ? ""
        : (() => {
            try {
              return JSON.stringify(result);
            } catch {
              return String(result);
            }
          })();
  let stripped = "";
  let inAnsiSeq = false;
  for (const ch of String(text)) {
    const code = ch.charCodeAt(0);
    if (inAnsiSeq) {
      if (code >= 0x40 && code <= 0x7e) inAnsiSeq = false;
      continue;
    }
    if (code === 0x1b) {
      inAnsiSeq = true;
      continue;
    }
    if (code <= 0x08) continue;
    if (code >= 0x0b && code <= 0x1f) continue;
    if (code === 0x7f) continue;
    stripped += ch;
  }
  const truncated =
    stripped.length > TOOL_OUTPUT_MAX_BYTES
      ? `${stripped.slice(0, TOOL_OUTPUT_MAX_BYTES)}\n...[truncated]`
      : stripped;
  return `<tool_output>\n${truncated}\n</tool_output>`;
}

module.exports = {
  sanitizeToolResultForLLM,
  TOOL_OUTPUT_MAX_BYTES,
};
