// SPDX-License-Identifier: MIT

/**
 * Drop-in console replacement with structured logging (issue #288).
 * Same API as console — adds timestamp + level prefix to every call.
 * Use: `const consoleLogger = require("../utils/logger/console");`
 */

const ts = () => new Date().toISOString();

// Route through console.* so existing jest spies and the winston
// console override (utils/logger/index.js) both keep working.
// Prepend the prefix to the first arg so the total argument count
// matches the original console call (tests use toHaveBeenCalledWith).
/* eslint-disable no-console */
const emit = (level, args, stream) => {
  if (args.length === 0) return stream(`[${ts()}] [${level}]`);
  const first = args[0];
  const prefix = `[${ts()}] [${level}] `;
  stream(
    prefix + (first instanceof Error ? first.stack : first),
    ...args.slice(1),
  );
};

module.exports = {
  log: (...a) => emit("INFO", a, console.log),
  info: (...a) => emit("INFO", a, console.log),
  warn: (...a) => emit("WARN", a, console.warn),
  error: (...a) => emit("ERROR", a, console.error),
  debug: (...a) => emit("DEBUG", a, console.log),
};
