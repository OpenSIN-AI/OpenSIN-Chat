// SPDX-License-Identifier: MIT
// E2E smoke tests for OpenSIN-Chat (Issue #455).
// Run with: npx playwright test tests/e2e/smoke.spec.js
//
// These tests verify the most critical user-facing flows after deployment:
//   1. Homepage loads and renders the login/setup screen
//   2. /api/ping responds with 200
//   3. /api/setup-complete returns a valid response
//   4. Static assets (CSS, JS) are served correctly
//   5. No console errors on initial page load
//
// Configuration: Set BASE_URL env var to target a specific deployment.
// Default: http://localhost:3000 (frontend dev server)

const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

test.describe("Smoke tests — deployment health", () => {
  test("homepage loads and renders without errors", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });

    // Page should not be blank
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Should have some content (either login form, setup wizard, or dashboard)
    const hasContent = await page.locator("body").textContent();
    expect(hasContent.trim().length).toBeGreaterThan(0);

    // No critical console errors (ignore favicon and extension errors)
    const realErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("ERR_BLOCKED_BY_CLIENT"),
    );
    expect(realErrors).toHaveLength(0);
  });

  test("/api/ping returns 200 with success/pong", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/ping`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success === true || body.message === "pong").toBeTruthy();
  });

  test("/api/setup-complete returns valid response", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/setup-complete`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(typeof body.setupComplete).toBe("boolean");
  });

  test("static CSS assets are served", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    // Check that at least one stylesheet is loaded
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test("static JS bundles are served", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    // Check that at least one script is loaded
    const scripts = await page.locator("script[src]").count();
    expect(scripts).toBeGreaterThan(0);
  });

  test("page title is set", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});

test.describe("Smoke tests — API health", () => {
  test("/api/system/env-dump responds (200 or 403)", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/system/env-dump`);
    // 200 = config served, 403 = auth blocking (both are healthy)
    expect([200, 403]).toContain(response.status());
  });

  test("unknown API route returns 404, not 500", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/nonexistent-route-12345`);
    expect(response.status()).toBe(404);
  });
});

test.describe("Smoke tests — workspace flow (if setup complete)", () => {
  test("setup-complete=false shows setup wizard or login", async ({
    page,
    request,
  }) => {
    const setupResponse = await request.get(`${BASE_URL}/api/setup-complete`);
    const { setupComplete } = await setupResponse.json();

    if (!setupComplete) {
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      // Should show either a login form, setup wizard, or onboarding screen
      const pageText = await page.locator("body").textContent();
      const hasAuthOrSetup =
        /login|sign in|setup|password|register|onboard|get started/i.test(
          pageText,
        );
      expect(hasAuthOrSetup).toBe(true);
    }
    // If setupComplete is true, we skip this test (would need auth credentials)
  });
});
