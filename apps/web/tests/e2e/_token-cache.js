// SPDX-License-Identifier: MIT
// Purpose: Shared token cache for E2E tests — avoids hitting the production
// rate limiter by logging in once and reusing the JWT across all test files.
// Docs: frontend/tests/e2e/README.doc.md
//
// The token is written to a temp file so that when Playwright runs multiple
// test files sequentially (--workers=1), each file reads the cached token
// instead of calling POST /api/request-token again. Includes retry logic
// with exponential backoff to handle the production rate limiter.
import { expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import os from "os";

const TOKEN_CACHE = path.join(os.tmpdir(), "opensin-chat-e2e-token.txt");

/**
 * Login and cache the token, or return the cached token if it exists.
 * Retries with exponential backoff if the rate limiter returns 429.
 *
 * Uses the OPENSIN_PASSWORD env var (defaulting to empty password for the
 * no-auth dev configuration).
 */
export async function sharedLogin(request) {
  const password = process.env.OPENSIN_PASSWORD || "";

  const base =
    process.env.APP_URL ||
    (typeof request !== "undefined" && request.context
      ? request.context().baseURL?.()
      : null) ||
    "http://localhost:38471";
  const url = `${base.replace(/\/$/, "")}/api/request-token`;

  // Try to read cached token first
  try {
    if (fs.existsSync(TOKEN_CACHE)) {
      const cached = fs.readFileSync(TOKEN_CACHE, "utf-8").trim();
      if (cached && cached.length > 20) return cached;
    }
  } catch {
    // ignore read errors
  }

  // Login with retry — the production rate limiter can block for several
  // minutes after too many requests. Retry with exponential backoff.
  const maxRetries = 10;
  const baseDelay = 5000; // 5s initial delay

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await request.post(url, {
      data: { username: "admin", password },
    });

    if (response.ok()) {
      const { token } = await response.json();
      expect(token).toBeTruthy();
      try {
        fs.writeFileSync(TOKEN_CACHE, token);
      } catch {
        // ignore write errors
      }
      return token;
    }

    // Rate limited — wait and retry
    const delay = baseDelay * Math.pow(1.5, attempt);
    console.log(
      `[sharedLogin] Rate limited (attempt ${attempt + 1}/${maxRetries}), waiting ${Math.round(delay / 1000)}s...`,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error(
    `Failed to login after ${maxRetries} retries — rate limiter is still blocking.`,
  );
}

/**
 * Clear the cached token (call after all tests are done if needed).
 */
export function clearTokenCache() {
  try {
    if (fs.existsSync(TOKEN_CACHE)) {
      fs.unlinkSync(TOKEN_CACHE);
    }
  } catch {
    // ignore
  }
}
