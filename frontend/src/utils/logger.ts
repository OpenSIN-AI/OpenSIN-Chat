// SPDX-License-Identifier: MIT
/**
 * Centralized, production-safe client-side logger.
 *
 * Goals (see issues #25 and #531):
 * - No console.error/console.log leaking into production runtime.
 * - Debug and info are silent in production; warnings are preserved.
 * - Errors are silent in production console but can be surfaced to the
 *   user via toast notifications through `reportError`.
 * - A single, swappable seam if we later want to forward logs to a
 *   remote error-reporting service (Sentry, Datadog, etc.).
 *
 * Usage:
 *   import logger from "@/utils/logger";
 *   logger.debug("state", value);             // dev-only
 *   logger.info("loaded models", count);       // dev-only
 *   logger.warn("deprecated API used");        // always (console.warn)
 *   logger.error("Failed to fetch:", err);     // dev-only console, prod silent
 *   logger.reportError("Failed to save settings", err); // dev: console + prod: toast
 */
const isDev = Boolean(import.meta.env?.DEV);

/**
 * Extract a human-readable message from an unknown error/value.
 * Handles Error objects, strings, and objects with a `.message` property.
 */
function extractMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "message" in value) {
    return String((value as { message: unknown }).message);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Lazily import showToast to avoid a circular dependency at module load
 * (toast.ts pulls in theme hooks which may import logger indirectly).
 */
async function showErrorToast(message: string) {
  try {
    const { default: showToast } = await import("@/utils/toast");
    showToast(message, "error");
  } catch {
    // Toast module unavailable — fail silently in production.
    if (isDev) console.warn("[logger] Could not load toast module for error reporting");
  }
}

const logger = {
  /** Verbose, development-only diagnostics. Silent in production. */
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },

  /** Informational, development-only. Silent in production. */
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },

  /** Warnings are always surfaced via console.warn. */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Errors are logged to console.error only in development.
   * In production, console.error is stripped (silent) to avoid
   * leaking error details to the browser console.
   */
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },

  /**
   * Report an error to the user with a toast notification.
   * In development, also logs to console.error for debugging.
   * In production, shows a user-facing toast and strips console output.
   *
   * @param message - User-facing message (string)
   * @param error - Optional error object or value for dev console
   */
  reportError: (message: string, error?: unknown) => {
    if (isDev) {
      console.error(message, error ?? "");
    }
    showErrorToast(error ? `${message}: ${extractMessage(error)}` : message);
  },

  /** Exposed for testing. */
  _extractMessage: extractMessage,
};

export default logger;
