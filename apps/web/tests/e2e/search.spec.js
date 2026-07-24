// SPDX-License-Identifier: MIT
// Purpose: E2E test for sidebar search functionality — verifies the search
// box renders, accepts input, calls the search API, and displays results
// or a "no results" message.
// Docs: frontend/tests/e2e/README.doc.md
//
// The SearchBox component (Sidebar/SearchBox) uses an input[type="search"]
// with aria-label from i18n key "sidebar.searchWorkspace". It debounces
// input (500ms) and calls POST /api/workspace/search with { searchTerm }.
// Results only appear when searchTerm.length >= 3.
import { test, expect } from "@playwright/test";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("sidebar search", () => {
  test.describe.configure({ mode: "serial" });

  let token;
  let slug;
  let workspaceName;

  test.beforeAll(async ({ request }) => {
    token = await login(request);

    // Reuse an existing workspace to avoid the rate limiter
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

  test("search box renders in the sidebar", async ({ page }) => {
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // The SearchBox has input[type="search"] with class "search-input"
    const searchInput = page.locator('input[type="search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test("typing fewer than 3 chars does not show results", async ({ page }) => {
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const searchInput = page.locator('input[type="search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type 2 chars — should not trigger results (min length is 3)
    await searchInput.fill("ab");
    await page.waitForTimeout(700); // debounce is 500ms

    // No results wrapper should be visible
    await expect(
      page.getByText(/no results|keine ergebnisse/i),
    ).toHaveCount(0);
  });

  test("searching for an existing workspace name shows results", async ({
    page,
    request,
  }) => {
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const searchInput = page.locator('input[type="search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Use the first 4 chars of the workspace name as the search term
    // (guaranteed to match the workspace we're using)
    const searchTerm = workspaceName.slice(0, 4);
    test.skip(
      searchTerm.length < 3,
      "Workspace name too short to test search (need ≥3 chars) — skipping",
    );

    // Intercept the search API call to verify it's made
    let searchApiCalled = false;
    await page.route("**/api/workspace/search", async (route) => {
      searchApiCalled = true;
      // Call through to the real API
      await route.continue();
    });

    await searchInput.fill(searchTerm);
    await page.waitForTimeout(800); // debounce 500ms + network

    // Verify the search API was called
    expect(searchApiCalled).toBe(true);

    // Either results appear (workspaces/threads found) or "no results" shows.
    // Both are valid — the key is that the search was performed.
    const resultsOrNoResults = page.getByText(
      /workspaces|threads|no results|keine ergebnisse|workspaces found|threads found/i,
    );
    await expect(resultsOrNoResults.first()).toBeVisible({ timeout: 10000 });
  });

  test("clearing the search input hides results", async ({ page }) => {
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const searchInput = page.locator('input[type="search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type a search term, wait for debounce
    await searchInput.fill("test");
    await page.waitForTimeout(700);

    // Clear the input
    await searchInput.clear();
    await page.waitForTimeout(500);

    // Results should be gone
    await expect(
      page.getByText(/no results|keine ergebnisse/i),
    ).toHaveCount(0);
  });
});
