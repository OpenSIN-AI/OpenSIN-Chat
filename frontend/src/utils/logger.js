// SPDX-License-Identifier: MIT
/**
 * Centralized client-side logger.
 *
 * Goals (see issue #25):
 * - No noisy debug/info logs leaking into the production bundle/runtime.
 * - Errors and warnings are always preserved so real failures stay visible.
 * - A single, swappable seam if we later want to forward logs to a service.
 *
 * Usage:
 *   import logger from "@/utils/logger";
 *   logger.error("Failed to fetch models:", err);
 *   logger.debug("state", value); // only prints in development
 */
const isDev = Boolean(import.meta.env?.DEV);

const logger = {
  /** Verbose, development-only diagnostics. Silent in production. */
  debug: (...args) => {
    if (isDev) console.log(...args);
  },
  /** Informational, development-only. Silent in production. */
  info: (...args) => {
    if (isDev) console.info(...args);
  },
  /** Warnings are always surfaced. */
  warn: (...args) => {
    console.warn(...args);
  },
  /** Errors are always surfaced. */
  error: (...args) => {
    console.error(...args);
  },
};

export default logger;
