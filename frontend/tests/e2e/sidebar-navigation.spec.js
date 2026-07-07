// SPDX-License-Identifier: MIT
// Purpose: E2E test for sidebar navigation — workspace list loading,
// clicking a workspace to enter chat, and sidebar collapse/expand toggle.
// Docs: frontend/tests/e2e/README.doc.md
//
// Uses an existing workspace from the server (listed via API) instead of
// creating a new one, to avoid hitting the workspace-creation rate limiter
// (5 per hour per IP).
import { test, expect } from "@playwright/test";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("sidebar navigation", () => {
  test.describe.configure({ mode: "serial" });

  let token;
  let slug;
  let workspaceName;

  test.beforeAll(async ({ request }) => {
    token = await login(request);

    // List existing workspaces and use the first one — avoids the
    // workspace-creation rate limiter (5/hour).
    const response = await request.get("/api/workspaces", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const { workspaces } = await response.json();
    expect(workspaces.length).toBeGreaterThan(0);
    slug = workspaces[0].slug;
    workspaceName = workspaces[0].name;
  });

  test.beforeEach(async ({ page }) => {
    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  test("workspace list loads and clicking a workspace opens chat", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const sidebar = page.getByRole("navigation", {
      name: /Main navigation/i,
    });
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const wsList = page.getByRole("list", { name: /Workspaces/i });
    await expect(wsList).toBeVisible({ timeout: 10000 });

    // Click the workspace link
    const wsLink = page
      .getByRole("link", { name: workspaceName })
      .first();
    await expect(wsLink).toBeVisible({ timeout: 10000 });
    await wsLink.click();

    // Verify URL changes to the workspace chat path
    await page.waitForURL(new RegExp(`/workspace/${slug}`), {
      timeout: 15000,
    });

    // Verify the chat input is visible
    await expect(page.locator("#primary-prompt-input")).toBeVisible({
      timeout: 30000,
    });
  });

  test("sidebar collapse/expand toggle works", async ({ page }) => {
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    await page
      .locator("#primary-prompt-input")
      .first()
      .waitFor({ state: "visible", timeout: 30000 });

    // Sidebar is initially visible
    const sidebar = page.getByRole("navigation", {
      name: /Main navigation/i,
    });
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Click to collapse — target the toggle button inside the sidebar nav
    // (there are two "Hide sidebar" buttons: one in LeftSidebarIconBar, one
    // in the sidebar header). Scope to the nav element.
    const hideBtn = sidebar.getByRole("button", {
      name: /Hide sidebar/i,
    });
    await expect(hideBtn).toBeVisible({ timeout: 10000 });
    await hideBtn.click();

    // After collapsing, the toggle button says "Show sidebar"
    // (check both possible locations)
    const showBtn = page.getByRole("button", {
      name: /Show sidebar/i,
    }).first();
    await expect(showBtn).toBeVisible({ timeout: 5000 });

    // Verify localStorage persisted the closed state
    const toggleState = await page.evaluate(() =>
      window.localStorage.getItem("opensin_sidebar_toggle"),
    );
    expect(toggleState).toBe("closed");

    // Click to expand
    await showBtn.click();

    const hideBtnAgain = page.getByRole("button", {
      name: /Hide sidebar/i,
    }).first();
    await expect(hideBtnAgain).toBeVisible({ timeout: 5000 });

    const toggleStateOpen = await page.evaluate(() =>
      window.localStorage.getItem("opensin_sidebar_toggle"),
    );
    expect(toggleStateOpen).toBe("open");
  });

  test("sidebar toggle state persists across page reload", async ({ page }) => {
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    await page
      .locator("#primary-prompt-input")
      .first()
      .waitFor({ state: "visible", timeout: 30000 });

    // Collapse the sidebar — scope to nav to avoid the LeftSidebarIconBar duplicate
    const sidebar = page.getByRole("navigation", {
      name: /Main navigation/i,
    });
    const hideBtn = sidebar.getByRole("button", {
      name: /Hide sidebar/i,
    });
    await expect(hideBtn).toBeVisible({ timeout: 10000 });
    await hideBtn.click();

    const showBtn = page.getByRole("button", {
      name: /Show sidebar/i,
    }).first();
    await expect(showBtn).toBeVisible({ timeout: 5000 });

    // Reload
    await page.reload({ waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // After reload, the sidebar should still be collapsed
    await expect(
      page.getByRole("button", { name: /Show sidebar/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
