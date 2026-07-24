// SPDX-License-Identifier: MIT
// Purpose: E2E test for workspace document upload — upload a .txt file
// through the ManageWorkspace modal and verify it appears in the document list.
// Docs: frontend/tests/e2e/README.doc.md
//
// Uses an existing workspace from the server to avoid the workspace-creation
// rate limiter. Skips gracefully if the document processor is offline.
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import os from "os";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("document upload flow", () => {
  test.describe.configure({ mode: "serial" });

  let token;
  let slug;
  let tmpFile;

  test.beforeAll(async ({ request }) => {
    token = await login(request);

    // List existing workspaces and use the first one
    const response = await request.get("/api/workspaces", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const { workspaces } = await response.json();
    expect(workspaces.length).toBeGreaterThan(0);
    slug = workspaces[0].slug;

    // Create a temporary .txt file for upload
    tmpFile = path.join(os.tmpdir(), `e2e-upload-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, "Hello world test content");
  });

  test.afterAll(async () => {
    if (tmpFile && fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  });

  test("upload a text file and verify it appears in document list", async ({
    page,
  }) => {
    await seedSession(page, token);
    await mockOnboardingCheck(page);

    await page.goto(`/workspace/${slug}`, { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // Wait for the chat composer to load
    await page
      .locator("#primary-prompt-input")
      .first()
      .waitFor({ state: "visible", timeout: 30000 });

    // Open the ManageWorkspace modal via the upload button in the sidebar.
    const uploadBtn = page
      .locator('[data-tooltip-id="upload-workspace"]')
      .first();
    await uploadBtn.waitFor({ state: "visible", timeout: 10000 });
    await uploadBtn.click();

    // The ManageWorkspace modal has a "Documents" tab button
    const documentsTab = page.getByRole("button", {
      name: /Documents/i,
    }).first();
    await expect(documentsTab).toBeVisible({ timeout: 10000 });

    // Check if the document processor is offline
    const processorOffline = page.getByText(/processor/i, { exact: false });
    if (await processorOffline.isVisible().catch(() => false)) {
      test.skip(true, "Document processor is offline — skipping upload test");
    }

    // The UploadFile component uses react-dropzone with a hidden file input
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    await fileInput.setInputFiles(tmpFile);

    // Wait for the file name to appear in the workspace directory
    const expectedName = path.basename(tmpFile);
    await expect(
      page.getByText(expectedName, { exact: false }).first(),
    ).toBeVisible({ timeout: 30000 });
  });
});
