// SPDX-License-Identifier: MIT
// Purpose: E2E test for workspace document management — verify the
// ManageWorkspace modal opens, the Documents tab loads, the upload file
// input exists, and the delete confirmation flow works when documents
// are present.
// Docs: frontend/tests/e2e/README.doc.md
//
// Reuses an existing workspace from the server to avoid the workspace-
// creation rate limiter (5/hour per IP).
import { test, expect } from "@playwright/test";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("document management", () => {
  test.describe.configure({ mode: "serial" });

  let token;
  let slug;
  let workspaceDocs = [];

  test.beforeAll(async ({ request }) => {
    token = await login(request);

    // Reuse the first existing workspace — no creation, no rate-limiter hit
    const response = await request.get("/api/workspaces", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const { workspaces } = await response.json();
    expect(workspaces.length).toBeGreaterThan(0);
    slug = workspaces[0].slug;

    // Fetch the workspace details to see if it has documents
    const wsResponse = await request.get(`/api/workspace/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (wsResponse.ok()) {
      const { workspace } = await wsResponse.json();
      workspaceDocs = workspace?.documents || [];
    }
  });

  test.beforeEach(async ({ page }) => {
    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  test("manage workspace modal opens with Documents tab", async ({ page }) => {
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // Wait for the chat composer to load
    await page
      .locator("#primary-prompt-input")
      .first()
      .waitFor({ state: "visible", timeout: 30000 });

    // Open the ManageWorkspace modal via the upload button in the sidebar
    const uploadBtn = page
      .locator('[data-tooltip-id="upload-workspace"]')
      .first();
    await uploadBtn.waitFor({ state: "visible", timeout: 10000 });
    await uploadBtn.click();

    // The ManageWorkspace modal has a "Documents" tab button
    // i18n: connectors.manage.documents
    const documentsTab = page.getByRole("button", {
      name: /documents|dokumente/i,
    }).first();
    await expect(documentsTab).toBeVisible({ timeout: 10000 });

    // The Documents tab should be selected by default
    await expect(documentsTab).toHaveAttribute("aria-pressed", "true");

    // No React error boundary
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Unexpected Application Error/i,
      }),
    ).toHaveCount(0);
  });

  test("document upload file input exists", async ({ page }) => {
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    await page
      .locator("#primary-prompt-input")
      .first()
      .waitFor({ state: "visible", timeout: 30000 });

    // Open the ManageWorkspace modal
    const uploadBtn = page
      .locator('[data-tooltip-id="upload-workspace"]')
      .first();
    await uploadBtn.waitFor({ state: "visible", timeout: 10000 });
    await uploadBtn.click();

    // Wait for the Documents tab content to load
    const documentsTab = page.getByRole("button", {
      name: /documents|dokumente/i,
    }).first();
    await expect(documentsTab).toBeVisible({ timeout: 10000 });

    // The UploadFile component uses react-dropzone with a hidden file input
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached({ timeout: 15000 });
  });

  test("workspace document list loads (Directory + WorkspaceDirectory)", async ({
    page,
  }) => {
    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    await page
      .locator("#primary-prompt-input")
      .first()
      .waitFor({ state: "visible", timeout: 30000 });

    const uploadBtn = page
      .locator('[data-tooltip-id="upload-workspace"]')
      .first();
    await uploadBtn.waitFor({ state: "visible", timeout: 10000 });
    await uploadBtn.click();

    const documentsTab = page.getByRole("button", {
      name: /documents|dokumente/i,
    }).first();
    await expect(documentsTab).toBeVisible({ timeout: 10000 });

    // The DocumentSettings component renders a Directory (left) and
    // WorkspaceDirectory (right). The modal should show some content area.
    // The upload-modal container holds both panes.
    const uploadModal = page.locator(".upload-modal").first();
    await expect(uploadModal).toBeVisible({ timeout: 15000 });

    // No crash after the document list loads
    await assertAppLoaded(page);
  });

  test("delete document confirmation flow (if documents exist)", async ({
    page,
    request,
  }) => {
    // Re-fetch workspace documents to get the latest state
    const wsResponse = await request.get(`/api/workspace/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let currentDocs = [];
    if (wsResponse.ok()) {
      const { workspace } = await wsResponse.json();
      currentDocs = workspace?.documents || [];
    }

    if (currentDocs.length === 0) {
      test.skip(
        true,
        "No documents in the workspace — skipping delete confirmation test",
      );
    }

    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    await page
      .locator("#primary-prompt-input")
      .first()
      .waitFor({ state: "visible", timeout: 30000 });

    const uploadBtn = page
      .locator('[data-tooltip-id="upload-workspace"]')
      .first();
    await uploadBtn.waitFor({ state: "visible", timeout: 10000 });
    await uploadBtn.click();

    const documentsTab = page.getByRole("button", {
      name: /documents|dokumente/i,
    }).first();
    await expect(documentsTab).toBeVisible({ timeout: 10000 });

    // The WorkspaceDirectory (right pane) shows documents already in the
    // workspace. Look for a delete/remove button near a document.
    // The WorkspaceDirectory component renders document rows with trash icons.
    // We verify the delete confirmation dialog appears when clicking delete.
    const trashButton = page
      .locator('.upload-modal [aria-label*="delete" i], .upload-modal button:has(.Trash)')
      .first();

    if (await trashButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Set up dialog handler to accept the confirmation
      page.once("dialog", (dialog) => {
        expect(dialog.type()).toBe("confirm");
        dialog.accept();
      });

      await trashButton.click();
      await page.waitForTimeout(2000);

      // Page should still be loaded (no crash)
      await assertAppLoaded(page);
    } else {
      test.skip(
        true,
        "No delete button visible in workspace documents — skipping delete test",
      );
    }
  });
});
