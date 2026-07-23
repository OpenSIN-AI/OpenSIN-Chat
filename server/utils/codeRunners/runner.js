// SPDX-License-Identifier: MIT

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const RUNNER_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_BYTES = 512 * 1024;

const RUNNER_DEFINITIONS = {
  "codex-cli": {
    executable: "codex",
    transport: "local-cli",
    args: (prompt) => ["--quiet", "--auto", prompt],
  },
  "claude-code": {
    executable: "claude",
    transport: "local-cli",
    args: (prompt) => ["-p", prompt, "--output-format", "text"],
  },
  opencode: {
    executable: "opencode",
    transport: "local-cli",
    args: (prompt) => ["run", prompt],
  },
  "mimo-code": {
    executable: "mimo",
    transport: "local-cli",
    args: (prompt) => ["run", prompt],
  },
  orca: {
    executable: "orca",
    transport: "api",
    args: (prompt) => ["worktree", "run", "--prompt", prompt],
  },
  "custom-cli": {
    executable: process.env.CUSTOM_CLI_EXECUTABLE || "echo",
    transport: "local-cli",
    args: (prompt) => [prompt],
  },
};

function getRunnerDefinition(runnerId) {
  return RUNNER_DEFINITIONS[runnerId] || null;
}

function isRunnerAvailable(runnerId) {
  const def = getRunnerDefinition(runnerId);
  if (!def) return false;
  if (def.transport !== "local-cli") return true;
  try {
    require("child_process").execSync(`which ${def.executable} 2>/dev/null`, {
      stdio: "ignore",
      timeout: 3000,
    });
    return true;
  } catch {
    return false;
  }
}

function createScratchDir(workspaceId, turnId) {
  const baseDir = path.join(
    process.env.STORAGE_DIR || path.join(__dirname, "../../storage"),
    "runner-scratch",
  );
  const dirName = `${workspaceId}-${turnId || crypto.randomUUID().slice(0, 8)}`;
  const scratchDir = path.join(baseDir, dirName);
  fs.mkdirSync(scratchDir, { recursive: true });
  return scratchDir;
}

function cleanupScratchDir(scratchDir) {
  if (!scratchDir) return;
  try {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  } catch {}
}

async function executeRunner({
  runnerId,
  prompt,
  workspaceId,
  turnId,
  cwd,
  onStdout,
  onStderr,
  timeoutMs = RUNNER_TIMEOUT_MS,
}) {
  const def = getRunnerDefinition(runnerId);
  if (!def) {
    return {
      ok: false,
      error: `Unknown runner: ${runnerId}`,
      stdout: "",
      stderr: "",
      exitCode: -1,
    };
  }

  if (!isRunnerAvailable(runnerId)) {
    return {
      ok: false,
      error: `Runner "${runnerId}" (${def.executable}) not found on server. Install it or choose a different runner.`,
      stdout: "",
      stderr: "",
      exitCode: -1,
    };
  }

  const scratchDir = cwd || createScratchDir(workspaceId, turnId);
  const args = def.args(prompt);

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let killed = false;
    let totalBytes = 0;

    const child = spawn(def.executable, args, {
      cwd: scratchDir,
      env: {
        ...process.env,
        HOME: scratchDir,
      },
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 0,
    });

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {}
      }, 5000);
    }, timeoutMs);

    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      totalBytes += chunk.length;
      if (totalBytes <= MAX_OUTPUT_BYTES) {
        stdout += chunk;
        if (onStdout) onStdout(chunk);
      }
    });

    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      totalBytes += chunk.length;
      if (totalBytes <= MAX_OUTPUT_BYTES) {
        stderr += chunk;
        if (onStderr) onStderr(chunk);
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      cleanupScratchDir(cwd ? null : scratchDir);
      resolve({
        ok: false,
        error: `Failed to spawn runner: ${err.message}`,
        stdout,
        stderr,
        exitCode: -1,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      cleanupScratchDir(cwd ? null : scratchDir);
      resolve({
        ok: code === 0,
        error: killed
          ? `Runner timed out after ${timeoutMs / 1000}s`
          : code !== 0
            ? `Runner exited with code ${code}`
            : null,
        stdout,
        stderr,
        exitCode: code,
      });
    });

    child.stdin.end();
  });
}

module.exports = {
  RUNNER_DEFINITIONS,
  getRunnerDefinition,
  isRunnerAvailable,
  executeRunner,
  createScratchDir,
  cleanupScratchDir,
};
