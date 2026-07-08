#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/**
 * validate-env-completeness.js — Verify that .env.example documents critical keys.
 *
 * Usage:
 *   node scripts/validate-env-completeness.js
 *
 * Exits with code 0 if all critical keys are documented, 1 otherwise.
 */

const fs = require("fs");
const path = require("path");

const ENV_EXAMPLE_PATH = path.join(__dirname, "../.env.example");

// Critical keys that must be in .env.example (documented or commented)
const CRITICAL_KEYS = [
  "JWT_SECRET",
  "SIG_KEY",
  "SIG_SALT",
  "LLM_PROVIDER",
  "VECTOR_DB",
  "EMBEDDING_ENGINE",
  "DATABASE_URL",
  "AUTH_TOKEN", // optional but documented
  "DISABLE_TELEMETRY",
  "WHISPER_PROVIDER",
  "TTS_PROVIDER",
  "STT_PROVIDER",
];

async function main() {
  if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
    console.error(`.env.example not found at ${ENV_EXAMPLE_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(ENV_EXAMPLE_PATH, "utf-8");
  const missing = [];

  for (const key of CRITICAL_KEYS) {
    // Check if key is mentioned (either set or commented)
    if (!content.includes(key)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(
      `[validate-env-completeness] ✗ Missing documentation for ${missing.length} critical key(s):`,
    );
    missing.forEach((k) => console.error(`  - ${k}`));
    process.exit(1);
  }

  console.log(
    `[validate-env-completeness] ✓ All ${CRITICAL_KEYS.length} critical keys are documented in .env.example`,
  );
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { CRITICAL_KEYS };
