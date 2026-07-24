#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Smoke test script for OpenSIN-Chat (Issue #375).
// Run with: node scripts/smoke.mjs [base-url]
// Default base URL: http://localhost:3001
//
// Checks the most critical endpoints after boot:
//   1. /api/ping — server is alive
//   2. /api/setup-complete — system initialization status
//   3. /api/system/env-dump — configuration is loaded (non-sensitive)
//
// Exits 0 on success, 1 on any failure. Each check prints a clear
// PASS/FAIL line with a hint on failure.

const BASE_URL = process.argv[2] || process.env.SMOKE_BASE_URL || "http://localhost:3001";
const TIMEOUT_MS = 5000;

const checks = [
  {
    name: "/api/ping (server alive)",
    path: "/api/ping",
    method: "GET",
    expect: (res, body) => {
      if (res.status !== 200) return `expected 200, got ${res.status}`;
      if (!body?.success && body?.message !== "pong") {
        return `expected { success: true } or { message: "pong" }, got ${JSON.stringify(body).slice(0, 200)}`;
      }
      return null;
    },
  },
  {
    name: "/api/setup-complete (system initialized)",
    path: "/api/setup-complete",
    method: "GET",
    expect: (res, body) => {
      if (res.status !== 200) return `expected 200, got ${res.status}`;
      if (typeof body?.setupComplete !== "boolean") {
        return `expected { setupComplete: boolean }, got ${JSON.stringify(body).slice(0, 200)}`;
      }
      return null;
    },
  },
  {
    name: "/api/system/env-dump (config loaded)",
    path: "/api/system/env-dump",
    method: "GET",
    expect: (res, body) => {
      // This endpoint may return 200 or 403 depending on auth/multi-user mode.
      // A 200 means the server is serving config; a 403 is also acceptable
      // (means auth is working). Anything else is a failure.
      if (res.status === 200 || res.status === 403) return null;
      return `expected 200 or 403, got ${res.status}`;
    },
  },
];

async function fetchWithTimeout(url, opts = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

async function runCheck(check) {
  const url = `${BASE_URL}${check.path}`;
  try {
    const res = await fetchWithTimeout(url, { method: check.method });
    const error = check.expect(res, res.body);
    if (error) {
      console.error(`FAIL  ${check.name} — ${error}`);
      return false;
    }
    console.log(`PASS  ${check.name}`);
    return true;
  } catch (err) {
    if (err.name === "AbortError") {
      console.error(`FAIL  ${check.name} — request timed out after ${TIMEOUT_MS}ms`);
    } else {
      console.error(`FAIL  ${check.name} — ${err.message}`);
    }
    console.error(`      URL: ${url}`);
    return false;
  }
}

async function main() {
  console.log(`\nSmoke test against: ${BASE_URL}\n`);
  let allPassed = true;
  for (const check of checks) {
    const passed = await runCheck(check);
    if (!passed) allPassed = false;
  }
  console.log("");
  if (allPassed) {
    console.log("All smoke checks passed. ✅");
    process.exit(0);
  } else {
    console.log("One or more smoke checks failed. ❌");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
