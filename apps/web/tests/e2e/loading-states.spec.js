// SPDX-License-Identifier: MIT
// Purpose: E2E coverage for loading states (delayed API responses, streaming indicator).
// Docs: frontend/tests/e2e/README.doc.md
//
// Uses delayed fulfill pattern for skeletons + .dot-falling.
// Route mocks only. No environment skips.
import { test, expect } from "@playwright/test";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("loading states", () => {
  test.describe.configure({ mode: "serial" });

  let token;
  let slug;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
    try {
      const resp = await request.get("/api/workspaces", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok()) {
        const { workspaces } = await resp.json();
        if (workspaces && workspaces.length > 0) {
          slug = workspaces[0].slug;
        }
      }
    } catch {
      // ok
    }
    if (!slug) slug = "e2e-load";
  });

  test.beforeEach(async ({ page }) => {
    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  test("delayed /api/workspaces shows loading skeleton/spinner before content", async ({ page }) => {
    await page.route("**/api/workspaces", async (route) => {
      if (route.request().method() === "GET") {
        // Simulate slow backend
        await new Promise((r) => setTimeout(r, 1500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            workspaces: [
              { id: 1, slug, name: "E2E Loading Test", createdAt: new Date().toISOString() },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Use domcontentloaded so we can observe loading state before full network settle
    await page.goto(`/workspace/${slug}`, { waitUntil: "domcontentloaded" });

    // Skeleton visible while the workspaces request is delayed (ActiveWorkspaces or HomeSkeleton)
    const loadingIndicator = page.locator(
      ".react-loading-skeleton, [class*='skeleton'], .animate-pulse, [role='status'][aria-busy='true']"
    );
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 3000 });

    // After delay, content should settle (no longer purely in skeleton-only state)
    await page.waitForTimeout(2200);
    await assertAppLoaded(page);

    // Main UI elements (composer or settings nav) become visible
    const ready = page.locator("#primary-prompt-input, nav a, main");
    await expect(ready.first()).toBeVisible({ timeout: 10000 });
  });

  test("delayed stream-chat shows .dot-falling mid-request then removes it", async ({ page }) => {
    await page.route("**/api/workspace/*/stream-chat", async (route) => {
      await new Promise((r) => setTimeout(r, 1400));
      // Fulfill with minimal success (no real stream body needed for indicator test)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const composer = page.locator("#primary-prompt-input");
    await expect(composer).toBeVisible({ timeout: 10000 });

    await composer.fill("loading indicator test");
    await composer.press("Enter");

    // Mid-request (while handler delays) the falling dots indicator must appear
    const dots = page.locator(".dot-falling");
    await expect(dots.first()).toBeVisible({ timeout: 3000 });

    // After the mock delay + a bit, indicator should be gone (response settled)
    await page.waitForTimeout(2200);
    await expect(dots).toHaveCount(0).catch(async () => {
      await expect(dots.first()).toBeHidden({ timeout: 5000 });
    });
  });
});
