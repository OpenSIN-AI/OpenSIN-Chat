// SPDX-License-Identifier: MIT

/**
 * Lightweight, dependency-free structured logger.
 *
 * Goals (see issue #288):
 * - Log levels with filtering via `LOG_LEVEL` (debug | info | warn | error)
 * - Module/context prefix on every line
 * - Optional machine-readable JSON output via `LOG_FORMAT=json` for log
 *   aggregation (Loki, Datadog, etc.)
 * - Timestamps on every entry
 *
 * This complements the existing winston-based console override
 * (`utils/logger/index.js`); it is opt-in and used by modules that want
 * structured, level-aware logging instead of raw `console.*`.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function currentLevel() {
  const envLevel = (process.env.LOG_LEVEL || "info").toLowerCase();
  return envLevel in LEVELS ? envLevel : "info";
}

const LEVEL_COLORS = {
  debug: "\x1b[90m", // gray
  info: "\x1b[36m", // cyan
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

/**
 * Emits a single log entry, respecting the configured `LOG_LEVEL` threshold.
 * @param {keyof typeof LEVELS} level
 * @param {string} moduleName - the source module/context (e.g. "genericOpenAi")
 * @param {string} message
 * @param {Record<string, unknown>} [meta] - optional structured metadata
 */
function log(level, moduleName, message, meta = {}) {
  if (LEVELS[level] < LEVELS[currentLevel()]) return;

  const ts = new Date().toISOString();
  const hasMeta = meta && Object.keys(meta).length > 0;

  let output;
  if (process.env.LOG_FORMAT === "json") {
    output = JSON.stringify({
      ts,
      level,
      module: moduleName,
      message,
      ...(hasMeta ? meta : {}),
    });
  } else {
    const color = LEVEL_COLORS[level] || "";
    output =
      `[${ts}] ${color}${level.toUpperCase()}${RESET} ` +
      `\x1b[36m[${moduleName}]${RESET} ${message}` +
      (hasMeta ? ` ${JSON.stringify(meta)}` : "");
  }

  // eslint-disable-next-line no-console
  if (level === "error") console.error(output);
  // eslint-disable-next-line no-console
  else console.log(output);
}

const logger = {
  debug: (moduleName, message, meta) => log("debug", moduleName, message, meta),
  info: (moduleName, message, meta) => log("info", moduleName, message, meta),
  warn: (moduleName, message, meta) => log("warn", moduleName, message, meta),
  error: (moduleName, message, meta) => log("error", moduleName, message, meta),
};

/**
 * Creates a logger bound to a fixed module name so callers don't repeat it.
 * @param {string} moduleName
 */
function createModuleLogger(moduleName) {
  return {
    debug: (message, meta) => logger.debug(moduleName, message, meta),
    info: (message, meta) => logger.info(moduleName, message, meta),
    warn: (message, meta) => logger.warn(moduleName, message, meta),
    error: (message, meta) => logger.error(moduleName, message, meta),
  };
}

module.exports = { logger, createModuleLogger, LEVELS };
