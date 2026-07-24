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

/**
 * The canonical root that all cwd values must stay within.
 * Defaults to STORAGE_DIR (the app's data directory) so admins can inspect
 * log/storage directories, but cannot escape to /, /etc, /var, etc.
 */
const ALLOWED_CWD_ROOT = path.resolve(process.env.STORAGE_DIR || process.cwd());

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
  // cat REMOVED — can read .env and private key files even with .. blocked
  head: { maxArgs: 3, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  tail: { maxArgs: 3, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  wc: { maxArgs: 2, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  ps: { maxArgs: 1, argPattern: /^[a-z-]+$/ },
  hostname: { maxArgs: 0, argPattern: null },
  id: { maxArgs: 0, argPattern: null },
  which: { maxArgs: 1, argPattern: /^[a-zA-Z0-9_.-]*$/ },
  // node/npm/yarn --version REMOVED — unnecessary surface; version info is
  // available in package.json or via the admin dashboard
  git: { maxArgs: 2, argPattern: /^(status|log|branch|--oneline|-s|-b)$/ },
};

/** Shell metacharacters that must never appear in any argument. */
const SHELL_META_RE = /[;&|`$<>(){}\\*?!#~^\n\r]/;

/**
 * Commands whose arguments may reference filesystem paths. For these, we
 * additionally reject any `..` path segment so the whitelist's intent
 * ("read-only, low-risk introspection") can't be used to walk outside of
 * the intended working directory and read arbitrary files (e.g. `.env`,
 * private keys) that happen to be readable by the server process.
 */
const PATH_ARG_COMMANDS = new Set([
  "ls",
  // "cat" removed from whitelist — see COMMAND_WHITELIST comment above
  "head",
  "tail",
  "du",
  "df",
  "which",
]);

/**
 * Returns true if any `/`-delimited segment of the argument is `..`,
 * which would let the argument escape the directory it's rooted in
 * (e.g. `cat ../../../.env`, `cat foo/../../secrets`).
 * @param {string} arg
 * @returns {boolean}
 */
function hasPathTraversalSegment(arg) {
  return arg.split("/").some((segment) => segment === "..");
}

/**
 * True for path-like args (not flags like `-la` / `-n`).
 * @param {string} arg
 * @returns {boolean}
 */
function isPathLikeArg(arg) {
  return typeof arg === "string" && arg.length > 0 && !arg.startsWith("-");
}

/**
 * True if a path-like argument escapes ALLOWED_CWD_ROOT when resolved against
 * the given working directory. Absolute args always escape unless they happen
 * to land under the root (which we still reject — absolute paths are banned).
 * @param {string} arg
 * @param {string} cwd
 * @param {string} [root=ALLOWED_CWD_ROOT]
 * @returns {boolean}
 */
function pathArgEscapesRoot(arg, cwd, root = ALLOWED_CWD_ROOT) {
  if (!isPathLikeArg(arg)) return false;
  if (path.isAbsolute(arg)) return true;
  if (hasPathTraversalSegment(arg)) return true;
  const resolved = path.resolve(cwd, arg);
  return resolved !== root && !resolved.startsWith(root + path.sep);
}

/**
 * Validates a parsed command + args against the whitelist.
 * Returns { ok: true } or { ok: false, reason: string }
 *
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd?: string }} [options] Optional cwd used to resolve path args.
 */
function validateCommand(cmd, args, options = {}) {
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

  const cwdForPaths = path.resolve(
    ALLOWED_CWD_ROOT,
    options.cwd && typeof options.cwd === "string" && options.cwd.trim()
      ? options.cwd.trim()
      : ".",
  );

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
    if (PATH_ARG_COMMANDS.has(cmd) && hasPathTraversalSegment(arg)) {
      return {
        ok: false,
        reason: "'..' path segments are not allowed in command arguments.",
      };
    }
    // Block absolute paths and any path arg that resolves outside the storage root.
    // head/tail previously could read /etc/passwd or host .env despite cwd jail.
    if (PATH_ARG_COMMANDS.has(cmd) && pathArgEscapesRoot(arg, cwdForPaths)) {
      return {
        ok: false,
        reason:
          "Absolute paths and paths outside the allowed working directory are not permitted.",
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
          if (hasPathTraversalSegment(cwd))
            return response.status(400).json({
              error: "'..' path segments are not allowed in cwd.",
            });
        }

        // Tokenize on whitespace — no shell parsing, no expansion.
        const tokens = command.trim().split(/\s+/);
        const [cmd, ...args] = tokens;

        // Resolve cwd relative to ALLOWED_CWD_ROOT (never relative to /).
        // path.resolve(root, absolutePath) returns the absolute path on POSIX,
        // so we always join then verify containment.
        const rawCwd =
          cwd && typeof cwd === "string" && cwd.trim() ? cwd.trim() : ".";
        const execCwd = path.resolve(ALLOWED_CWD_ROOT, rawCwd);
        if (
          execCwd !== ALLOWED_CWD_ROOT &&
          !execCwd.startsWith(ALLOWED_CWD_ROOT + path.sep)
        ) {
          return response.status(403).json({
            error: "cwd must stay within the allowed working directory.",
          });
        }

        // Validate with resolved cwd so path args cannot escape the jail.
        const validation = validateCommand(cmd, args, { cwd: rawCwd });
        if (!validation.ok)
          return response.status(403).json({ error: validation.reason });

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
  hasPathTraversalSegment,
  pathArgEscapesRoot,
  isPathLikeArg,
  COMMAND_WHITELIST,
  ALLOWED_CWD_ROOT,
};
