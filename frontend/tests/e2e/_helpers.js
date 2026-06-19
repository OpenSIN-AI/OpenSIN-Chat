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

/**
 * Authenticate against the running backend (single-user mode) and return the
 * JWT. Username "admin" with an empty password matches the default dev/prod
 * single-user configuration.
 */
export async function login(request) {
  const response = await request.post("/api/request-token", {
    data: { username: "admin", password: "" },
  });
  expect(response.ok()).toBeTruthy();
  const { token } = await response.json();
  expect(token).toBeTruthy();
  return token;
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
    window.localStorage.setItem("openafd_authToken", t);
    window.localStorage.setItem(
      "openafd_user",
      JSON.stringify({ username: "admin" }),
    );
    window.localStorage.setItem("openafd-demo-unlocked", "1");
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
  const slug = await createWorkspace(request, token);
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
