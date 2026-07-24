// SPDX-License-Identifier: MIT
/**
 * Escape a string so it can be safely embedded inside a `new RegExp(...)`
 * pattern. Without this, user-controlled values (e.g. slash-command names,
 * media keywords) that contain regex metacharacters would either throw a
 * SyntaxError at runtime or open a ReDoS (catastrophic backtracking) vector.
 *
 * @param {string} value
 * @returns {string} The regex-safe string.
 */
function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { escapeRegExp };
