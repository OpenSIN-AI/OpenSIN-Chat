// SPDX-License-Identifier: MIT
// Purpose: E2E test for sidebar navigation — workspace list loading,
// clicking a workspace to enter chat, and sidebar collapse/expand toggle.
// Docs: frontend/tests/e2e/README.doc.md
import { test, expect } from "@playwright/test";
import {
  createWorkspace,
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("sidebar navigation", () => {
  test.describe.configure({ mode: "serial" });

  let token;
  let slug;
  let createdSlugs = [];

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test.beforeEach(async ({ page, request }) => {
    slug = await createWorkspace(request, token);
    createdSlugs.push(slug);
    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  test.afterEach(async ({ request }) => {
    for (const s of createdSlugs) {
      await request
        .delete(`/api/workspace/${s}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {});
    }
    createdSlugs = [];
  });

  test("workspace list loads and clicking a workspace opens chat", async ({
    page,
    request,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const sidebar = page.getByRole("navigation", {
      name: /Main navigation/i,
    });
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const wsList = page.getByRole("list", { name: /Workspaces/i });
    await expect(wsList).toBeVisible({ timeout: 10000 });

    // Fetch workspace name from API
    const wsResponse = await request.get(`/api/workspace/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { workspace } = await wsResponse.json();

    // Click the workspace link
    const wsLink = page
      .getByRole("link", { name: workspace.name })
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

    // Click to collapse — button says "Hide sidebar"
    const hideBtn = page.getByRole("button", {
      name: /Hide sidebar/i,
    });
    await expect(hideBtn).toBeVisible({ timeout: 10000 });
    await hideBtn.click();

    // After collapsing, the toggle button says "Show sidebar"
    const showBtn = page.getByRole("button", {
      name: /Show sidebar/i,
    });
    await expect(showBtn).toBeVisible({ timeout: 5000 });

    // Verify localStorage persisted the closed state
    const toggleState = await page.evaluate(() =>
      window.localStorage.getItem("openafd_sidebar_toggle"),
    );
    expect(toggleState).toBe("closed");

    // Click to expand
    await showBtn.click();

    const hideBtnAgain = page.getByRole("button", {
      name: /Hide sidebar/i,
    });
    await expect(hideBtnAgain).toBeVisible({ timeout: 5000 });

    const toggleStateOpen = await page.evaluate(() =>
      window.localStorage.getItem("openafd_sidebar_toggle"),
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

    // Collapse the sidebar
    const hideBtn = page.getByRole("button", {
      name: /Hide sidebar/i,
    });
    await expect(hideBtn).toBeVisible({ timeout: 10000 });
    await hideBtn.click();

    const showBtn = page.getByRole("button", {
      name: /Show sidebar/i,
    });
    await expect(showBtn).toBeVisible({ timeout: 5000 });

    // Reload
    await page.reload({ waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // After reload, the sidebar should still be collapsed
    await expect(
      page.getByRole("button", { name: /Show sidebar/i }),
    ).toBeVisible({ timeout: 10000 });
  });
});
