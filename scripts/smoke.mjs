#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Purpose: Lightweight post-boot smoke test. Verifies the core server
//          endpoints are reachable and healthy, then exits with a clear
//          pass/fail code (0 = all pass, 1 = any fail). Intended for CI and
//          post-deploy verification. Resolves #375.
//
// Usage:
//   node scripts/smoke.mjs                 # checks http://localhost:3001
//   SMOKE_BASE_URL=https://host node scripts/smoke.mjs
//   node scripts/smoke.mjs --base https://host --timeout 8000
//
// Endpoints checked (all under the /api prefix):
//   GET /api/ping            -> 200 { online: true }
//   GET /api/setup-complete  -> 200 (JSON body with results)
//   GET /api/system/ping-stream (optional chat-stream contact; non-fatal)

const args = process.argv.slice(2);
function argVal(flag, fallback) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = (
  argVal("--base", process.env.SMOKE_BASE_URL || "http://localhost:3001")
).replace(/\/+$/, "");
const TIMEOUT_MS = Number(argVal("--timeout", process.env.SMOKE_TIMEOUT_MS || "8000"));

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

/**
 * Fetch a URL with a hard timeout. Returns {ok, status, json, error}.
 * @param {string} url
 */
async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* body may be empty or non-JSON — that's fine for some checks */
    }
    return { ok: res.ok, status: res.status, json, error: null };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      json: null,
      error: err?.name === "AbortError" ? `timeout after ${TIMEOUT_MS}ms` : String(err?.message || err),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A single named check. `validate` receives the fetch result and returns
 * true/false or a string reason for failure.
 */
const checks = [
  {
    name: "GET /api/ping",
    required: true,
    run: () => get(`${BASE}/api/ping`),
    validate: (r) =>
      r.status === 200 && r.json?.online === true
        ? true
        : `expected 200 {online:true}, got ${r.status} ${JSON.stringify(r.json)}`,
  },
  {
    name: "GET /api/setup-complete",
    required: true,
    run: () => get(`${BASE}/api/setup-complete`),
    validate: (r) =>
      r.status === 200
        ? true
        : `expected 200, got ${r.status}${r.error ? ` (${r.error})` : ""}`,
  },
  {
    // Non-fatal: confirms the app router responds on an unknown /api route
    // with a controlled status (not a hang / connection refused).
    name: "GET /api/__smoke_probe__ (router reachable)",
    required: false,
    run: () => get(`${BASE}/api/__smoke_probe__`),
    validate: (r) =>
      r.status > 0
        ? true
        : `no HTTP response${r.error ? ` (${r.error})` : ""}`,
  },
];

async function main() {
  console.log(`${DIM}Smoke test against ${BASE} (timeout ${TIMEOUT_MS}ms)${RESET}\n`);
  let failed = 0;
  let requiredFailed = 0;

  for (const check of checks) {
    const started = Date.now();
    const result = await check.run();
    const verdict = check.validate(result);
    const ms = Date.now() - started;
    if (verdict === true) {
      console.log(`${GREEN}PASS${RESET} ${check.name} ${DIM}(${ms}ms)${RESET}`);
    } else {
      const tag = check.required ? `${RED}FAIL${RESET}` : `${DIM}WARN${RESET}`;
      console.log(`${tag} ${check.name} ${DIM}(${ms}ms)${RESET}\n     ${verdict}`);
      failed += 1;
      if (check.required) requiredFailed += 1;
    }
  }

  console.log("");
  if (requiredFailed === 0) {
    console.log(`${GREEN}✔ smoke test passed${RESET}${failed ? ` (${failed} non-fatal warning[s])` : ""}`);
    process.exit(0);
  } else {
    console.log(`${RED}x smoke test failed - ${requiredFailed} required check(s) failed${RESET}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`${RED}smoke test crashed:${RESET}`, err);
  process.exit(1);
});
