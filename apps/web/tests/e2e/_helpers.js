// SPDX-License-Identifier: MIT
// Purpose: Shared helpers for OpenSIN-Chat Playwright E2E tests.
// Docs: frontend/tests/e2e/README.doc.md
//
// Centralises the login → create-workspace → seed-session → mock-onboarding
// bootstrap so every spec starts from the same known state, and adds an
// `assertAppLoaded` guard that turns a blank "element not found" timeout into
// a precise diagnosis when a production build crashes on load (e.g. the
// `regeneratorRuntime is not defined` regression that took down the whole
// React tree before the `regenerator-runtime` polyfill was added to main.tsx).
import { expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import os from "os";

const TOKEN_CACHE_FILE = path.join(os.tmpdir(), "opensin-chat-e2e-token.txt");

/**
 * Authenticate against the running backend (single-user mode) and return the
 * JWT. Username "admin" with an empty password matches the default dev/prod
 * single-user configuration.
 *
 * In production the AUTH_TOKEN is set, so the caller must pass the live
 * password via the OPENSIN_PASSWORD env var. Without that env, this helper
 * falls back to an empty password (matching the no-auth dev config).
 *
 * Checks a temp-file token cache first to avoid hitting the production rate
 * limiter when multiple test files call login() in quick succession. The
 * cache is written by _token-cache.js::sharedLogin on the first successful
 * login and is valid for ~30 days (JWT exp).
 */
export async function login(request) {
  const password = process.env.OPENSIN_PASSWORD || "";

  // Determine the absolute base URL — Playwright's request fixture uses
  // playwright.config's baseURL (defaulting to localhost:38471), which is
  // NOT the production server when we run against sinchat.delqhi.com. Honor
  // APP_URL when set.
  const base =
    process.env.APP_URL ||
    (typeof request !== "undefined" && request.context
      ? request.context().baseURL?.()
      : null) ||
    "http://localhost:38471";
  const url = `${base.replace(/\/$/, "")}/api/request-token`;

  // Try cached token first (shared across test files via temp file)
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      const cached = fs.readFileSync(TOKEN_CACHE_FILE, "utf-8").trim();
      if (cached && cached.length > 20) return cached;
    }
  } catch {
    // ignore read errors
  }

  const response = await request.post(url, {
    headers: { "Content-Type": "application/json" },
    data: `{ "username": "admin", "password": ${JSON.stringify(password)} }`,
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.valid).toBe(true);
  expect(body.token).toBeTruthy();
  const token = body.token;
  // Sanity-check: token must look like a JWT with the encrypted password or
  // a non-empty user id. If we see `p:null` we hit the dev fallback branch
  // that returns a JWT the server treats as unauthenticated.
  try {
    const decoded = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString(),
    );
    if (decoded.p === null && !decoded.id) {
      throw new Error(
        `Login response is a dev-branch JWT (no password / no user id). ` +
          `POST ${url} returned {valid:true,token:<p:null>}. ` +
          `The server likely hit the no-AUTH_TOKEN fallback branch. ` +
          `Set OPENSIN_PASSWORD and ensure request Content-Type is JSON.`,
      );
    }
  } catch (err) {
    if (err instanceof Error && err.name === "SyntaxError") {
      // not a JWT — let downstream fail
    } else {
      throw err;
    }
  }

  // Cache the token for subsequent calls
  try {
    fs.writeFileSync(TOKEN_CACHE_FILE, token);
  } catch {
    // ignore write errors
  }

  return token;
}

/**
 * Get an existing workspace slug via the API, or create one if none exist.
 * Reuses the first workspace to avoid hitting rate limits during E2E runs.
 */
export async function getOrCreateWorkspace(request, token) {
  // Try to get an existing workspace first
  const listResp = await request.get("/api/workspaces", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (listResp.ok()) {
    try {
      const { workspaces } = await listResp.json();
      if (workspaces && workspaces.length > 0) {
        return workspaces[0].slug;
      }
    } catch (e) { console.warn("[_helpers] non-fatal error:", e?.message || e); }
  }
  // Fall back to creating one
  return createWorkspace(request, token);
}

/**
 * Create a throwaway workspace via the API so the test has a real slug to
 * navigate to. The home page does not auto-create one on first load.
 */
export async function createWorkspace(request, token) {
  const response = await request.post("/api/workspace/new", {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
  });
  expect(response.ok()).toBeTruthy();
  const { workspace } = await response.json();
  expect(workspace?.slug).toBeTruthy();
  return workspace.slug;
}

/**
 * Seed the browser session with the auth token, user, and English locale
 * before any application code reads localStorage, so PrivateRoute lets us
 * through without an unauthenticated flash.
 */
export async function seedSession(page, token) {
  await page.addInitScript((t) => {
    window.localStorage.setItem("opensin_authToken", t);
    window.localStorage.setItem(
      "opensin_user",
      // Include role: "admin" so SettingsSidebar shows all options
      // (MenuOption hides groups when user?.role is undefined).
      JSON.stringify({ username: "admin", role: "admin" }),
    );
    window.localStorage.setItem("opensin-demo-unlocked", "1");
    window.localStorage.setItem("i18nextLng", "en");
  }, token);
}

/**
 * Intercept the onboarding check so PrivateRoute does not redirect to the
 * onboarding flow. Works around a backend issue where `POST /api/onboarding`
 * returns 200 but does not persist the onboarding-complete flag.
 */
export async function mockOnboardingCheck(page) {
  await page.route("**/api/onboarding", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ onboardingComplete: true }),
    });
  });
}

/**
 * Full bootstrap: log in, create a workspace, seed the session, mock
 * onboarding, and navigate to the workspace chat page. Returns the slug.
 *
 * Pass `waitFor` to choose what to await after navigation:
 *   - "attach"  (default) — wait for the attach button (chat composer ready)
 *   - "textarea"           — wait for the prompt textarea (chat input ready)
 */
export async function bootstrapWorkspaceChat(
  page,
  request,
  { waitFor = "attach" } = {},
) {
  const token = await login(request);
  const slug = await getOrCreateWorkspace(request, token);
  await seedSession(page, token);
  await mockOnboardingCheck(page);

  await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
  await assertAppLoaded(page);

  const selector =
    waitFor === "textarea"
      ? "#primary-prompt-input"
      : '[data-testid="attach-item-trigger"]';
  await page.locator(selector).first().waitFor({ state: "visible", timeout: 30000 });
  return slug;
}

/**
 * Guard against a production build that crashes on load.
 *
 * When the React tree throws during initial render (e.g. a missing polyfill
 * such as `regeneratorRuntime`), react-router renders its default error
 * boundary with the heading "Unexpected Application Error!" and the raw
 * exception text. Without this guard every downstream locator times out with
 * a generic "element not found", hiding the real root cause. This helper fails
 * fast with the actual exception so the failure is self-diagnosing.
 */
export async function assertAppLoaded(page) {
  const errorHeading = page.getByRole("heading", {
    level: 2,
    name: /Unexpected Application Error/i,
  });
  if (await errorHeading.isVisible().catch(() => false)) {
    const detail = await page
      .getByRole("heading", { level: 3 })
      .first()
      .textContent()
      .catch(() => "(no detail)");
    throw new Error(
      `Application crashed on load — React error boundary rendered.\n` +
        `Root cause: ${detail}\n` +
        `This is a production build bug (not a test bug); the chat UI never mounted.`,
    );
  }
}
