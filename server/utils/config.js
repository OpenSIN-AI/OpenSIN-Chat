// SPDX-License-Identifier: MIT
/**
 * Centralised environment-variable helpers.
 *
 * All process.env accesses in new code should go through these helpers so
 * that:
 * - Missing / empty values return explicit fallbacks instead of undefined.
 * - Boolean and integer coercion is consistent across the codebase.
 * - Tests can swap the entire module with a single mock.
 *
 * Existing direct process.env accesses in server/models/systemSettings/ will
 * migrate to these helpers incrementally — do not do a bulk replace that could
 * introduce subtle breakage.
 */

/**
 * Read a string environment variable.
 * Returns `fallback` (default: null) when the variable is absent or an empty string.
 * @param {string} key
 * @param {string|null} [fallback=null]
 * @returns {string|null}
 */
function env(key, fallback = null) {
  const value = process.env[key];
  return value === undefined || value === "" ? fallback : value;
}

/**
 * Read a boolean environment variable.
 * Truthy values: "true", "1".  Everything else is falsy.
 * @param {string} key
 * @param {boolean} [fallback=false]
 * @returns {boolean}
 */
function envBool(key, fallback = false) {
  const value = process.env[key];
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

/**
 * Read an integer environment variable.
 * Returns `fallback` (default: 0) when the variable is absent, empty, or not
 * parseable as an integer.
 * @param {string} key
 * @param {number} [fallback=0]
 * @returns {number}
 */
function envInt(key, fallback = 0) {
  const parsed = parseInt(process.env[key], 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Read a float environment variable.
 * Returns `fallback` (default: 0) when the variable is absent, empty, or not
 * parseable as a float.
 * @param {string} key
 * @param {number} [fallback=0]
 * @returns {number}
 */
function envFloat(key, fallback = 0) {
  const parsed = parseFloat(process.env[key]);
  return Number.isNaN(parsed) ? fallback : parsed;
}

module.exports = { env, envBool, envInt, envFloat };
