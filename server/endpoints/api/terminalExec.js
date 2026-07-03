// SPDX-License-Identifier: MIT
/**
 * Terminal Execution REST API endpoint.
 *
 * Purpose: Executes a small set of whitelisted, read-only shell commands.
 *          Intended for development workflows and admin tooling — NEVER
 *          enabled by default in production.
 *
 * Endpoint:
 *   POST /terminal/exec  — execute a whitelisted command
 *
 * Security model (allowlist, not blocklist):
 *   - Only available in development mode OR when ENABLE_TERMINAL_EXEC=true
 *   - Requires authenticated admin role
 *   - Rate-limited to 5 requests per minute
 *   - Commands are validated against an explicit whitelist of read-only
 *     binaries with per-command argument rules
 *   - Executed via child_process.execFile with shell:false — no shell is
 *     ever spawned, so shell operators / substitution are impossible
 *   - 30-second hard timeout and 1 MiB output cap per command
 *
 * Input:  { command: string, cwd?: string }
 * Output: { stdout: string, stderr: string, exitCode: number }
 */

const { execFile } = require("child_process");
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
const MAX_OUTPUT_BYTES = 1024 * 1024;

const execRateLimit = simpleRateLimit({
  bucket: "terminal-exec",
  max: 5,
  windowMs: 60 * 1000,
});

/**
 * Whitelist of commands that may be executed via the terminal endpoint.
 * Only read-only, non-destructive commands are permitted.
 * Each entry maps a command name to its allowed argument count and an
 * optional per-argument character pattern.
 */
const COMMAND_WHITELIST = {
  ls: { maxArgs: 3, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  pwd: { maxArgs: 0, argPattern: null },
  echo: { maxArgs: 8, argPattern: /^[a-zA-Z0-9_.,:'"=@+\s/-]*$/ },
  date: { maxArgs: 1, argPattern: /^[+%a-zA-Z0-9_\s:/-]*$/ },
  whoami: { maxArgs: 0, argPattern: null },
  uname: { maxArgs: 1, argPattern: /^-[a-z]+$/ },
  uptime: { maxArgs: 0, argPattern: null },
  df: { maxArgs: 2, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  du: { maxArgs: 3, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  free: { maxArgs: 1, argPattern: /^-[a-z]+$/ },
  cat: { maxArgs: 1, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  head: { maxArgs: 3, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  tail: { maxArgs: 3, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  wc: { maxArgs: 2, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  ps: { maxArgs: 1, argPattern: /^[a-z-]+$/ },
  hostname: { maxArgs: 0, argPattern: null },
  id: { maxArgs: 0, argPattern: null },
  which: { maxArgs: 1, argPattern: /^[a-zA-Z0-9_.-]*$/ },
  node: { maxArgs: 1, argPattern: /^(--version|-v)$/ },
  npm: { maxArgs: 1, argPattern: /^(--version|-v)$/ },
  yarn: { maxArgs: 1, argPattern: /^(--version|-v)$/ },
  git: { maxArgs: 2, argPattern: /^(status|log|branch|--oneline|-s|-b)$/ },
};

/** Shell metacharacters that must never appear in any argument. */
const SHELL_META_RE = /[;&|`$<>(){}\\*?!#~^\n\r]/;

/**
 * Validates a parsed command + args against the whitelist.
 * Returns { ok: true } or { ok: false, reason: string }
 */
function validateCommand(cmd, args) {
  if (!Object.prototype.hasOwnProperty.call(COMMAND_WHITELIST, cmd)) {
    return {
      ok: false,
      reason: `Command '${cmd}' is not allowed. Only whitelisted read-only commands may be executed.`,
    };
  }

  const rule = COMMAND_WHITELIST[cmd];

  if (args.length > rule.maxArgs) {
    return {
      ok: false,
      reason: `Too many arguments for '${cmd}' (max ${rule.maxArgs}).`,
    };
  }

  for (const arg of args) {
    if (SHELL_META_RE.test(arg)) {
      return { ok: false, reason: "Shell metacharacters are not allowed." };
    }
    if (rule.argPattern && !rule.argPattern.test(arg)) {
      return {
        ok: false,
        reason: `Argument '${arg}' contains disallowed characters.`,
      };
    }
  }

  return { ok: true };
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

        // Tokenize on whitespace — no shell parsing, no expansion.
        const tokens = command.trim().split(/\s+/);
        const [cmd, ...args] = tokens;

        const validation = validateCommand(cmd, args);
        if (!validation.ok)
          return response.status(403).json({ error: validation.reason });

        const execCwd =
          cwd && typeof cwd === "string" && cwd.trim()
            ? path.resolve(cwd)
            : process.cwd();

        await new Promise((resolve) => {
          execFile(
            cmd,
            args,
            {
              timeout: TIMEOUT_MS,
              cwd: execCwd,
              maxBuffer: MAX_OUTPUT_BYTES,
              shell: false, // critical — never spawn a shell
            },
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
  validateCommand,
  isTerminalExecEnabled,
  COMMAND_WHITELIST,
};
