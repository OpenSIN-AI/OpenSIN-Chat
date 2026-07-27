// SPDX-License-Identifier: MIT
// Prepare an isolated SQLite database and ephemeral test-only credentials before
// running the legacy root endpoint suite. Nothing from a developer or live
// environment is read or reused.

import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const runtimeDir = path.join(repoRoot, ".local", "test-runtime");
const databasePath = path.join(runtimeDir, "integration.db");
const databaseUrl = `file:${databasePath}`;

mkdirSync(runtimeDir, { recursive: true });
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(`${databasePath}${suffix}`, { force: true });
}

const env = {
  ...process.env,
  NODE_ENV: "test",
  INTEGRATION_TEST: "true",
  DATABASE_URL: databaseUrl,
  AUTH_TOKEN: "test",
  JWT_SECRET: randomBytes(48).toString("hex"),
  SIG_KEY: randomBytes(32).toString("hex"),
  SIG_SALT: randomBytes(16).toString("hex"),
  DISABLE_RATE_LIMITS: "true",
  POLITICIAN_API_MAX_RETRIES: "0",
  TELEMETRY_DISABLED: "true",
};

function run(args) {
  const child = spawnSync("yarn", args, {
    cwd: repoRoot,
    env,
    stdio: "inherit",
  });
  if (child.error) throw child.error;
  return child.status ?? 1;
}

let exitCode = 1;
try {
  const migrateStatus = run([
    "workspace",
    "opensin-chat-server",
    "prisma:migrate",
  ]);
  if (migrateStatus !== 0) {
    process.exitCode = migrateStatus;
  } else {
    exitCode = run(["vitest", "run", "--config", "vitest.config.js"]);
    process.exitCode = exitCode;
  }
} finally {
  for (const suffix of ["", "-shm", "-wal"]) {
    rmSync(`${databasePath}${suffix}`, { force: true });
  }
}
