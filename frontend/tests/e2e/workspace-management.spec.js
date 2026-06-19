// SPDX-License-Identifier: MIT
// Purpose: E2E test for workspace lifecycle — create, sidebar visibility,
// rename, and delete.
// Docs: frontend/tests/e2e/README.doc.md
//
// Flow: login → create workspace (API) → verify in sidebar → navigate to
// workspace settings → rename via UI → verify rename → delete via UI →
// verify redirect to home. afterEach cleans up any surviving workspace
// via the DELETE API so test failures never leak workspaces.
import { test, expect } from "@playwright/test";
import {
  createWorkspace,
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("workspace management lifecycle", () => {
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

  test("create → see in sidebar → rename → delete", async ({
    page,
    request,
  }) => {
    // ── 1. Navigate to home and verify workspace appears in sidebar ──
    await page.goto("/", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const sidebar = page.getByRole("navigation", {
      name: /Main navigation/i,
    });
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const wsList = page.getByRole("list", { name: /Workspaces/i });
    await expect(wsList).toBeVisible({ timeout: 10000 });

    // Fetch the workspace name from the API
    const wsResponse = await request.get(`/api/workspace/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(wsResponse.ok()).toBeTruthy();
    const { workspace } = await wsResponse.json();
    const originalName = workspace.name;

    // Verify the workspace name appears in the sidebar list
    await expect(
      page.getByRole("listitem").filter({ hasText: originalName }),
    ).toBeVisible({ timeout: 10000 });

    // ── 2. Navigate to workspace settings → General Appearance ──
    await page.goto(`/workspace/${slug}/settings/general-appearance`, {
      waitUntil: "networkidle",
    });
    await assertAppLoaded(page);

    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await expect(nameInput).toHaveValue(originalName);

    // ── 3. Rename the workspace ──
    const renamed = `renamed-${Date.now()}`;
    await nameInput.fill(renamed);

    const updateBtn = page.getByRole("button", {
      name: /Update Workspace/i,
    });
    await expect(updateBtn).toBeVisible({ timeout: 5000 });
    await updateBtn.click();

    await page.waitForTimeout(2000);

    // Verify the rename persisted via API
    const checkResponse = await request.get(`/api/workspace/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { workspace: updatedWs } = await checkResponse.json();
    expect(updatedWs.name).toBe(renamed);

    // ── 4. Delete the workspace ──
    const deleteBtn = page.getByRole("button", {
      name: /Delete Workspace/i,
    });
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });

    page.once("dialog", (dialog) => dialog.accept());
    await deleteBtn.click();

    // After deletion, the app redirects to home
    await page.waitForURL("/", { timeout: 15000 });
    await assertAppLoaded(page);

    // Verify the workspace no longer appears in the sidebar
    await expect(
      page.getByRole("listitem").filter({ hasText: renamed }),
    ).toHaveCount(0, { timeout: 10000 });

    createdSlugs = createdSlugs.filter((s) => s !== slug);
  });
});
