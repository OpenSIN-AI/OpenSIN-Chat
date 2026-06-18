// SPDX-License-Identifier: MIT
// Purpose: Provide a singleton logger that uses winston in production and falls back to console elsewhere.
// Docs: index.doc.md

const winston = require("winston");

let _winstonLogger;

function formatArgs(args) {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.stack; // If argument is an Error object, return its stack trace
      } else if (typeof arg === "object") {
        return JSON.stringify(arg); // Convert objects to JSON string
      }
      return arg; // Otherwise, return as-is
    })
    .join(" ");
}

function buildWinstonLogger() {
  const logger = winston.createLogger({
    level: "info",
    defaultMeta: { service: "collector" },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, service, origin = "" }) => {
            return `\x1b[36m[${service}]\x1b[0m${
              origin ? `\x1b[33m[${origin}]\x1b[0m` : ""
            } ${level}: ${message}`;
          })
        ),
      }),
    ],
  });

  // Redirect global console methods to the winston logger so existing console.* calls are captured.
  // eslint-disable-next-line no-console
  console.log = function (...args) {
    logger.info(formatArgs(args));
  };
  // eslint-disable-next-line no-console
  console.error = function (...args) {
    logger.error(formatArgs(args));
  };
  // eslint-disable-next-line no-console
  console.info = function (...args) {
    logger.info(formatArgs(args));
  };

  return logger;
}

/**
 * Sets and returns the application logger.
 * In production a winston logger is created once and reused.
 * In any other environment the global console is returned.
 * @returns {winston.Logger | console} - instantiated logger interface.
 */
function setLogger() {
  if (process.env.NODE_ENV !== "production") {
    return console;
  }
  if (!_winstonLogger) {
    _winstonLogger = buildWinstonLogger();
  }
  return _winstonLogger;
}

module.exports = setLogger;
