// SPDX-License-Identifier: MIT
const { reqBody } = require("../../utils/http");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

/**
 * Whitelist of commands that may be executed via the terminal endpoint.
 * Only read-only, non-destructive commands are permitted.
 * Each entry maps a command name to its allowed argument patterns (regex per arg).
 */
const COMMAND_WHITELIST = {
  ls: { maxArgs: 3, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  pwd: { maxArgs: 0, argPattern: null },
  echo: { maxArgs: 5, argPattern: /^[a-zA-Z0-9_.\s"'=/-]*$/ },
  date: { maxArgs: 1, argPattern: /^[+%a-zA-Z0-9_\s/-]*$/ },
  whoami: { maxArgs: 0, argPattern: null },
  uname: { maxArgs: 1, argPattern: /^-[a-z]+$/ },
  env: { maxArgs: 0, argPattern: null },
  uptime: { maxArgs: 0, argPattern: null },
  df: { maxArgs: 2, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  du: { maxArgs: 3, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  cat: { maxArgs: 1, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  head: { maxArgs: 3, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  tail: { maxArgs: 3, argPattern: /^[a-zA-Z0-9_./-]*$/ },
  wc: { maxArgs: 2, argPattern: /^[a-zA-Z0-9_./-]*$/ },
};

/** Shell metacharacters that must never appear in any argument. */
const SHELL_META_RE = /[;&|`$<>(){}[\]\\*?!#~^]/;

const EXEC_TIMEOUT_MS = 5000;
const MAX_OUTPUT_BYTES = 8192;

/**
 * Validates a parsed command + args against the whitelist.
 * Returns { ok: true } or { ok: false, reason: string }
 */
function validateCommand(cmd, args) {
  if (!Object.prototype.hasOwnProperty.call(COMMAND_WHITELIST, cmd)) {
    return { ok: false, reason: `Command '${cmd}' is not allowed.` };
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

/**
 * POST /api/utils/terminal/exec
 * Body: { command: string }   — a single command string, e.g. "ls -la /tmp"
 * Response: { output: string, exitCode: number } | { error: string, exitCode: number }
 *
 * Only whitelisted read-only commands are executed.
 * No shell is spawned — execFile is used to prevent injection.
 */
function terminalExecEndpoint(app) {
  if (!app) return;

  app.post(
    "/utils/terminal/exec",
    [validatedRequest],
    async (request, response) => {
      try {
        const { command } = reqBody(request);

        if (!command || typeof command !== "string" || !command.trim()) {
          return response.status(400).json({
            error: "command must be a non-empty string.",
            exitCode: 1,
          });
        }

        // Split into tokens — no shell expansion, simple whitespace split
        const tokens = command.trim().split(/\s+/);
        const [cmd, ...args] = tokens;

        const validation = validateCommand(cmd, args);
        if (!validation.ok) {
          return response
            .status(403)
            .json({ error: validation.reason, exitCode: 126 });
        }

        try {
          const { stdout, stderr } = await execFileAsync(cmd, args, {
            timeout: EXEC_TIMEOUT_MS,
            maxBuffer: MAX_OUTPUT_BYTES,
            shell: false, // critical — no shell, prevents injection
          });

          const output = (stdout || stderr || "").slice(0, MAX_OUTPUT_BYTES);
          return response.status(200).json({ output, exitCode: 0 });
        } catch (execErr) {
          // execFile rejects on non-zero exit or timeout
          const output = (
            execErr.stdout ||
            execErr.stderr ||
            execErr.message ||
            ""
          ).slice(0, MAX_OUTPUT_BYTES);

          const exitCode =
            execErr.code === "ETIMEDOUT"
              ? 124
              : typeof execErr.code === "number"
                ? execErr.code
                : 1;

          return response.status(200).json({ output, exitCode });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[terminal/exec]", e.message);
        return response
          .status(500)
          .json({ error: "Internal server error.", exitCode: 1 });
      }
    },
  );
}

module.exports = { terminalExecEndpoint };
