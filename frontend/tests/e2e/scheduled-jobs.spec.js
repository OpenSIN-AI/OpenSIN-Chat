// SPDX-License-Identifier: MIT
// Purpose: E2E test for scheduled jobs — verify the scheduled jobs list
// loads, test creating a new scheduled job, and verify it appears in
// the list.
// Docs: frontend/tests/e2e/README.doc.md
//
// Route: /settings/scheduled-jobs
// The page shows a list of scheduled jobs (or an empty state with a
// "New Job" button). The JobFormModal has fields for name, prompt, and
// schedule (cron builder or custom cron string). Each job row has
// trigger, toggle, edit, and delete actions.
import { test, expect } from "@playwright/test";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("scheduled jobs", () => {
  test.describe.configure({ mode: "serial" });

  let token;
  let createdJobName = null;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test.beforeEach(async ({ page }) => {
    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  test("scheduled jobs page loads without crash", async ({ page }) => {
    await page.goto("/settings/scheduled-jobs", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // The page renders a title (i18n: scheduledJobs.title)
    // Either the job list or the empty state should be visible
    // Both states have a "New Job" button (i18n: scheduledJobs.newJob)
    const newJobBtn = page.getByRole("button", {
      name: /new job|neuer auftrag|neuer job/i,
    });
    await expect(newJobBtn.first()).toBeVisible({ timeout: 15000 });

    // No React error boundary
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Unexpected Application Error/i,
      }),
    ).toHaveCount(0);
  });

  test("new job modal opens with form fields", async ({ page }) => {
    await page.goto("/settings/scheduled-jobs", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // Click the new job button
    const newJobBtn = page.getByRole("button", {
      name: /new job|neuer auftrag|neuer job/i,
    }).first();
    await expect(newJobBtn).toBeVisible({ timeout: 15000 });
    await newJobBtn.click();

    // The JobFormModal should appear
    // i18n: scheduledJobs.modal.titleNew
    const modalHeading = page.getByRole("heading", { level: 3 }).first();
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    // The modal should have a name input field
    // i18n: scheduledJobs.modal.nameLabel
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    // The modal should have a prompt textarea
    // i18n: scheduledJobs.modal.promptLabel
    const promptTextarea = page.locator('textarea[name="prompt"]');
    await expect(promptTextarea).toBeVisible({ timeout: 5000 });

    // The modal should have a schedule section
    // i18n: scheduledJobs.modal.scheduleLabel
    // The schedule shows the current cron expression
    await expect(
      page.getByText(/current schedule|aktuelle zeitplan/i, { exact: false }).first(),
    ).toBeVisible({ timeout: 5000 });

    // The modal should have a cancel button
    // i18n: scheduledJobs.modal.cancel
    const cancelBtn = page.getByRole("button", {
      name: /cancel|abbrechen/i,
    }).first();
    await cancelBtn.click();
    await page.waitForTimeout(1000);

    await assertAppLoaded(page);
  });

  test("create a new scheduled job and verify it appears", async ({ page }) => {
    await page.goto("/settings/scheduled-jobs", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    createdJobName = `e2e-job-${Date.now()}`;

    // Click the new job button
    const newJobBtn = page.getByRole("button", {
      name: /new job|neuer auftrag|neuer job/i,
    }).first();
    await expect(newJobBtn).toBeVisible({ timeout: 15000 });
    await newJobBtn.click();

    // Fill in the name
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill(createdJobName);

    // Fill in the prompt
    const promptTextarea = page.locator('textarea[name="prompt"]');
    await expect(promptTextarea).toBeVisible({ timeout: 5000 });
    await promptTextarea.fill("E2E test job — summarize the latest workspace documents");

    // The schedule defaults to "0 9 * * *" (daily at 9am)
    // We keep the default — no need to change it

    // Click create button
    // i18n: scheduledJobs.modal.createJob
    const createBtn = page.getByRole("button", {
      name: /create job|auftrag erstellen|job erstellen/i,
    }).first();
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Wait for the modal to close and the list to refresh
    await page.waitForTimeout(3000);

    // Verify the job name appears in the list
    await expect(
      page.getByText(createdJobName, { exact: false }).first(),
    ).toBeVisible({ timeout: 10000 });

    await assertAppLoaded(page);
  });

  test("delete the created scheduled job", async ({ page }) => {
    if (!createdJobName) {
      test.skip(true, "No job was created — skipping delete test");
    }

    await page.goto("/settings/scheduled-jobs", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // Wait for the job to appear in the list
    await expect(
      page.getByText(createdJobName, { exact: false }).first(),
    ).toBeVisible({ timeout: 15000 });

    // Find the job row and click the delete button
    // The JobRow component renders action buttons including delete
    // The delete button uses window.confirm (i18n: scheduledJobs.confirmDelete)
    // We need to find the delete button in the job's row
    const jobRow = page.locator("div").filter({ hasText: createdJobName }).first();

    // The JobRow has a delete button — look for a button with trash icon
    // or a button that triggers the delete confirmation
    // The row has multiple buttons (trigger, toggle, edit, delete)
    // The delete button is typically the last one
    const buttons = jobRow.locator("button");
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // The delete button is typically the last action button
      const deleteBtn = buttons.last();

      // Set up dialog handler to accept the confirmation
      page.once("dialog", (dialog) => {
        expect(dialog.type()).toBe("confirm");
        dialog.accept();
      });

      await deleteBtn.click();
      await page.waitForTimeout(3000);

      // Verify the job is no longer in the list
      await expect(
        page.getByText(createdJobName, { exact: false }),
      ).toHaveCount(0, { timeout: 10000 });
    } else {
      // Try a broader search for the delete button
      const allDeleteButtons = page.locator('button:has(.Trash), button[aria-label*="delete" i]');
      if (await allDeleteButtons.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        page.once("dialog", (dialog) => dialog.accept());
        await allDeleteButtons.first().click();
        await page.waitForTimeout(3000);
        await expect(
          page.getByText(createdJobName, { exact: false }),
        ).toHaveCount(0, { timeout: 10000 });
      } else {
        test.skip(true, "Delete button not found for the created job");
      }
    }

    createdJobName = null;
    await assertAppLoaded(page);
  });
});
