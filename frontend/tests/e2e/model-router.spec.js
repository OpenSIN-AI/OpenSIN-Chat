// SPDX-License-Identifier: MIT
// Purpose: E2E test for model router configuration — verify the model
// router page loads, test creating a new router, and test removing a
// router rule.
// Docs: frontend/tests/e2e/README.doc.md
//
// Route: /settings/model-routers
// The page shows a list of model routers (or an empty state with a create
// button). The NewRouterModal has fields for name, description, fallback
// provider/model, and cooldown. Each router row has edit (pencil) and
// delete (X) buttons.
import { test, expect } from "@playwright/test";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("model router configuration", () => {
  test.describe.configure({ mode: "serial" });

  let token;
  let createdRouterName = null;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test.beforeEach(async ({ page }) => {
    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  test("model routers page loads without crash", async ({ page }) => {
    await page.goto("/settings/model-routers", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // The page renders a title (i18n: model-router.title)
    // Either the router list or the empty state should be visible
    // The empty state has a "New Router" button (i18n: model-router.new-router-button)
    // The non-empty state also has a "New Router" button in the header
    const newRouterBtn = page.getByRole("button", {
      name: /new router|neuer router/i,
    });
    await expect(newRouterBtn.first()).toBeVisible({ timeout: 15000 });

    // No React error boundary
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Unexpected Application Error/i,
      }),
    ).toHaveCount(0);
  });

  test("new router modal opens with form fields", async ({ page }) => {
    await page.goto("/settings/model-routers", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // Click the new router button
    const newRouterBtn = page.getByRole("button", {
      name: /new router|neuer router/i,
    }).first();
    await expect(newRouterBtn).toBeVisible({ timeout: 15000 });
    await newRouterBtn.click();

    // The NewRouterModal should appear
    // i18n: model-router.new-router.title
    const modalHeading = page.getByRole("heading", { level: 3 }).first();
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    // The modal should have a name input field
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    // The modal should have a description input field
    const descInput = page.locator('input[name="description"]');
    await expect(descInput).toBeVisible({ timeout: 5000 });

    // The modal should have a cooldown input field
    const cooldownInput = page.locator('input[name="cooldown_seconds"]');
    await expect(cooldownInput).toBeVisible({ timeout: 5000 });

    // The modal should have a cancel button
    // i18n: model-router.new-router.cancel
    const cancelBtn = page.getByRole("button", {
      name: /cancel|abbrechen/i,
    }).first();
    await cancelBtn.click();
    await page.waitForTimeout(1000);

    await assertAppLoaded(page);
  });

  test("create a new model router and verify it appears", async ({ page }) => {
    await page.goto("/settings/model-routers", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    createdRouterName = `e2e-router-${Date.now()}`;

    // Click the new router button
    const newRouterBtn = page.getByRole("button", {
      name: /new router|neuer router/i,
    }).first();
    await expect(newRouterBtn).toBeVisible({ timeout: 15000 });
    await newRouterBtn.click();

    // Fill in the name
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill(createdRouterName);

    // Fill in the description
    const descInput = page.locator('input[name="description"]');
    await descInput.fill("E2E test router — safe to delete");

    // The fallback provider/model picker uses select elements.
    // The default provider comes from system settings (LLMProvider).
    // We do NOT change the provider — selecting an unconfigured one opens
    // a configuration modal that intercepts pointer events (issue #...).
    // If the default provider is already set, the form will submit fine.
    // If not, we fill the model text input directly.
    const providerSelect = page.locator("select").first();
    await expect(providerSelect).toBeVisible({ timeout: 10000 });

    // Check if the provider select already has a value (from system settings)
    const providerValue = await providerSelect.inputValue();
    if (!providerValue) {
      // No default provider — try to select "Fireworks AI" which should be configured
      const options = await providerSelect.locator("option").allTextContents();
      const fireworksIdx = options.findIndex(
        (text) => /fireworks/i.test(text) && !/setup required/i.test(text),
      );
      if (fireworksIdx > 0) {
        await providerSelect.selectOption({ index: fireworksIdx });
        await page.waitForTimeout(1000);
      } else {
        // No configured provider available — skip the creation test
        const cancelBtn = page.getByRole("button", {
          name: /cancel|abbrechen/i,
        }).first();
        await cancelBtn.click().catch((e) => console.warn("[model-router.spec] non-fatal error:", e?.message || e));
        createdRouterName = null;
        test.skip(true, "No configured LLM provider available — skipping router creation test");
      }
    }

    // Fill the model field — it may be a select or a text input
    const modelField = page.locator(
      'select[name="fallback_model"], input[name="fallback_model"]',
    ).first();
    if (await modelField.isVisible({ timeout: 5000 }).catch(() => false)) {
      const tagName = await modelField.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === "select") {
        const modelOptions = await modelField.locator("option").count();
        if (modelOptions > 1) {
          await modelField.selectOption({ index: 1 });
        }
      } else {
        await modelField.fill("default-model");
      }
    }

    // Click create button — use force:true to bypass any overlay interception
    // i18n: model-router.new-router.create
    const createBtn = page.getByRole("button", {
      name: /create router|router erstellen|create/i,
    }).first();
    await createBtn.click({ force: true });

    // Wait for the modal to close and the list to refresh
    await page.waitForTimeout(3000);

    // Verify the router name appears in the list
    // The RouterRow shows the router name in a span
    await expect(
      page.getByText(createdRouterName, { exact: false }).first(),
    ).toBeVisible({ timeout: 10000 });

    await assertAppLoaded(page);
  });

  test("delete the created model router", async ({ page }) => {
    if (!createdRouterName) {
      test.skip(true, "No router was created — skipping delete test");
    }

    await page.goto("/settings/model-routers", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // Wait for the router to appear in the list
    await expect(
      page.getByText(createdRouterName, { exact: false }).first(),
    ).toBeVisible({ timeout: 15000 });

    // Find the router row and click the delete (X) button
    // The RouterRow renders two action buttons: edit (PencilSimple) and delete (X)
    // The delete button is the LAST button in the row
    // Use aria-label for a more specific selector
    const routerRow = page
      .locator("div")
      .filter({ hasText: createdRouterName })
      .first();

    // The delete button has aria-label from i18n: model-router.toast-deleted
    // Or we can find the last button in the row
    const deleteBtn = routerRow.locator("button").last();

    // Set up dialog handler to accept the confirmation
    // i18n: model-router.delete-confirm
    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      dialog.accept();
    });

    await deleteBtn.click();
    await page.waitForTimeout(3000);

    // Verify the router is no longer in the list
    await expect(
      page.getByText(createdRouterName, { exact: false }),
    ).toHaveCount(0, { timeout: 10000 });

    createdRouterName = null;
    await assertAppLoaded(page);
  });
});
