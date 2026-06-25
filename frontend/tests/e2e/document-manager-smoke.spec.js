// SPDX-License-Identifier: MIT
// Purpose: Simplified document-manager smoke test for production verification.
// Docs: frontend/tests/e2e/README.doc.md
import { test, expect } from "@playwright/test";
import { bootstrapWorkspaceChat } from "./_helpers.js";

test.describe("document manager smoke", () => {
  test("document manager modal opens", async ({ page, request }) => {
    await bootstrapWorkspaceChat(page, request, { waitFor: "attach" });

    // The upload button opens the document manager modal.
    const uploadBtn = page.locator('[data-tooltip-id="upload-workspace"]').first();
    await expect(uploadBtn).toBeVisible({ timeout: 10000 });
    await uploadBtn.click();

    // The modal should contain a file input (Documents tab content).
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached({ timeout: 15000 });

    // No React error boundary
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Unexpected Application Error/i,
      }),
    ).toHaveCount(0);
  });
});
