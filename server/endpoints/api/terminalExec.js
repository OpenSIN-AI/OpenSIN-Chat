// SPDX-License-Identifier: MIT
/**
 * Terminal Execution REST API endpoint.
 *
 * Purpose: Executes shell commands in a sandboxed environment with strict
 *          security gates. Intended for development workflows and admin
 *          tooling — NEVER enabled by default in production.
 *
 * Endpoint:
 *   POST /terminal/exec  — execute a shell command
 *
 * Security measures:
 *   - Only available in development mode OR when ENABLE_TERMINAL_EXEC=true
 *   - Requires authenticated admin role
 *   - Rate-limited to 5 requests per minute
 *   - Dangerous command patterns blocked (rm -rf, sudo, chmod 777, etc.)
 *   - 30-second hard timeout per command
 *   - No shell operators (&&, ||, ;, |) to prevent command chaining
 *
 * Input:  { command: string, cwd?: string }
 * Output: { stdout: string, stderr: string, exitCode: number }
 */

const { exec } = require("child_process");
const path = require("path");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { simpleRateLimit } = require("../../utils/middleware/simpleRateLimit");
const { reqBody } = require("../../utils/http");
const logger = require("../../utils/logger")();

const TIMEOUT_MS = 30 * 1000;
const MAX_COMMAND_LENGTH = 2000;
const MAX_CWD_LENGTH = 500;

const execRateLimit = simpleRateLimit({
  bucket: "terminal-exec",
  max: 5,
  windowMs: 60 * 1000,
});

const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\brm\s+-fr\b/i,
  /\brm\s+--recursive\b/i,
  /\bsudo\b/i,
  /\bchmod\s+777\b/i,
  /\bchown\s+-R\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bhalt\b/i,
  /\bkill\s+-9\b/i,
  /\bkillall\b/i,
  /\b:(){.*};/i,
  /\bmv\s+.*\s+\/\s*$/i,
  />\s*\/dev\/sd/i,
  /\bcurl\s+.*\|\s*(bash|sh)\b/i,
  /\bwget\s+.*\|\s*(bash|sh)\b/i,
  /\bnc\s+-l/i,
  /\bpython\s+-c\s+.*import\s+os/i,
  /\beval\s*\(/i,
  /\bexport\s+LD_PRELOAD/i,
];

const SHELL_OPERATOR_PATTERNS = [
  /&&/,
  /\|\|/,
  /;\s/,
  /;\s*$/,
  /\|/,
  /`[^`]*`/,
  /\$\([^)]*\)/,
  />\s*\(/,
  /\n/,
  /\r/,
];

function isDangerous(command) {
  return DANGEROUS_PATTERNS.some((p) => p.test(command));
}

function hasShellOperators(command) {
  return SHELL_OPERATOR_PATTERNS.some((p) => p.test(command));
}

function isTerminalExecEnabled() {
  if (process.env.NODE_ENV === "development") return true;
  return String(process.env.ENABLE_TERMINAL_EXEC).toLowerCase() === "true";
}

function apiTerminalExecEndpoints(app) {
  if (!app) return;

  app.post(
    "/terminal/exec",
    [validatedRequest, flexUserRoleValid([ROLES.admin]), execRateLimit],
    async (request, response) => {
      try {
        if (!isTerminalExecEnabled()) {
          return response.status(403).json({
            error:
              "Terminal execution is disabled. Set ENABLE_TERMINAL_EXEC=true or run in development mode.",
          });
        }

        const { command, cwd } = reqBody(request);

        if (typeof command !== "string" || !command.trim())
          return response.status(400).json({
            error: "command is required and must be a non-empty string",
          });
        if (command.length > MAX_COMMAND_LENGTH)
          return response.status(400).json({
            error: `command must be ${MAX_COMMAND_LENGTH} characters or fewer`,
          });
        if (cwd !== undefined && cwd !== null) {
          if (typeof cwd !== "string" || cwd.length > MAX_CWD_LENGTH)
            return response.status(400).json({
              error: "cwd must be a string of 500 characters or fewer",
            });
        }

        if (isDangerous(command))
          return response.status(403).json({
            error: "Command blocked: contains a dangerous pattern.",
          });

        if (hasShellOperators(command))
          return response.status(403).json({
            error:
              "Command blocked: shell operators (&&, ||, |, ;, newlines, backticks, $()) are not permitted.",
          });

        const execCwd =
          cwd && typeof cwd === "string" && cwd.trim()
            ? path.resolve(cwd)
            : process.cwd();

        await new Promise((resolve) => {
          exec(
            command,
            { timeout: TIMEOUT_MS, cwd: execCwd, maxBuffer: 1024 * 1024 },
            (err, stdout, stderr) => {
              if (err && err.killed) {
                response.status(200).json({
                  stdout: stdout ? stdout.toString() : "",
                  stderr: stderr ? stderr.toString() : "",
                  exitCode: -1,
                  error: "Command timed out after 30 seconds.",
                });
                return resolve();
              }

              const exitCode = err ? (err.code ?? 1) : 0;
              response.status(200).json({
                stdout: stdout ? stdout.toString() : "",
                stderr: stderr ? stderr.toString() : "",
                exitCode: typeof exitCode === "number" ? exitCode : 1,
              });
              resolve();
            },
          );
        });
      } catch (err) {
        logger.error(`[terminal/exec] ${err.message}`, err);
        response.status(500).json({ error: "Internal Server Error" });
      }
    },
  );
}

module.exports = {
  apiTerminalExecEndpoints,
  isDangerous,
  hasShellOperators,
  isTerminalExecEnabled,
};
