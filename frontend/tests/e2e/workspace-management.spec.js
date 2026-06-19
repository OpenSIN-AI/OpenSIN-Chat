// SPDX-License-Identifier: MIT
// Purpose: E2E test for workspace lifecycle — create, sidebar visibility,
// rename, and delete.
// Docs: frontend/tests/e2e/README.doc.md
//
// Flow: login → create workspace (API) → verify in sidebar → navigate to
// workspace settings → rename via UI → verify rename → delete via UI →
// verify redirect to home. Skips if the workspace-creation rate limiter
// (5/hour per IP) blocks the create call.
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
  let createdSlug = null;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test.beforeEach(async ({ page }) => {
    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  test.afterEach(async ({ request }) => {
    if (createdSlug) {
      await request
        .delete(`/api/workspace/${createdSlug}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {});
      createdSlug = null;
    }
  });

  test("create → see in sidebar → rename → delete", async ({
    page,
    request,
  }) => {
    // ── 1. Create workspace via API ──
    const createResponse = await request.post("/api/workspace/new", {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `e2e-mgmt-${Date.now()}` },
    });

    if (!createResponse.ok()) {
      test.skip(
        true,
        "Workspace creation rate-limited (5/hour) — skipping workspace management test",
      );
    }

    const { workspace } = await createResponse.json();
    slug = workspace.slug;
    createdSlug = slug;
    const originalName = workspace.name;

    // ── 2. Navigate to home and verify workspace appears in sidebar ──
    await page.goto("/", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    const sidebar = page.getByRole("navigation", {
      name: /Main navigation/i,
    });
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const wsList = page.getByRole("list", { name: /Workspaces/i });
    await expect(wsList).toBeVisible({ timeout: 10000 });

    // Verify the workspace name appears in the sidebar list
    await expect(
      page.getByRole("listitem").filter({ hasText: originalName }),
    ).toBeVisible({ timeout: 10000 });

    // ── 3. Navigate to workspace settings → General Appearance ──
    await page.goto(`/workspace/${slug}/settings/general-appearance`, {
      waitUntil: "networkidle",
    });
    await assertAppLoaded(page);

    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await expect(nameInput).toHaveValue(originalName);

    // ── 4. Rename the workspace ──
    const renamed = `renamed-${Date.now()}`;
    await nameInput.fill(renamed);
    await page.waitForTimeout(500);

    // The save button only appears when hasChanges is true
    const updateBtn = page.getByRole("button", {
      name: /update workspace|workspace aktualisieren/i,
    });
    await expect(updateBtn).toBeVisible({ timeout: 5000 });
    await updateBtn.click();

    // Wait for the success toast or network response
    await page.waitForTimeout(3000);

    // Verify the rename persisted via API
    const checkResponse = await request.get(`/api/workspace/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { workspace: updatedWs } = await checkResponse.json();
    expect(updatedWs.name).toBe(renamed);

    // ── 5. Delete the workspace ──
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

    createdSlug = null; // already deleted via UI
  });
});
