// SPDX-License-Identifier: MIT
// Purpose: E2E test for chat embed widgets — verify the embed widget
// configuration page loads, test creating an embed widget, and test
// copying the embed code snippet.
// Docs: frontend/tests/e2e/README.doc.md
//
// Route: /settings/embed-chat-widgets
// The page has a two-pane layout: left sidebar (Widgets / History) and
// right content area showing EmbedConfigsView (table + create button).
import { test, expect } from "@playwright/test";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("embed widgets", () => {
  test.describe.configure({ mode: "serial" });

  let token;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test.beforeEach(async ({ page }) => {
    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  test("embed widgets page loads without crash", async ({ page }) => {
    await page.goto("/settings/embed-chat-widgets", {
      waitUntil: "networkidle",
    });
    await assertAppLoaded(page);

    // The page renders a title (i18n: chatEmbedWidgets.title)
    // and a left sidebar with "Widgets" and "History" items
    await expect(
      page.getByText(/Widgets/i, { exact: true }).first(),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText(/History/i, { exact: true }).first(),
    ).toBeVisible({ timeout: 10000 });

    // No React error boundary
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Unexpected Application Error/i,
      }),
    ).toHaveCount(0);
  });

  test("embed configs view shows create button and table", async ({ page }) => {
    await page.goto("/settings/embed-chat-widgets", {
      waitUntil: "networkidle",
    });
    await assertAppLoaded(page);

    // The EmbedConfigsView renders a "Create" CTA button
    // i18n: embeddable.create
    const createBtn = page.getByRole("button", {
      name: /create|erstellen/i,
    });
    await expect(createBtn.first()).toBeVisible({ timeout: 15000 });

    // The table should render with column headers
    // i18n: embeddable.table.workspace, embeddable.table.chats, etc.
    await expect(
      page.getByText(/workspace|arbeitsbereich/i, { exact: false }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("create embed widget modal opens and has form fields", async ({
    page,
  }) => {
    await page.goto("/settings/embed-chat-widgets", {
      waitUntil: "networkidle",
    });
    await assertAppLoaded(page);

    // Click the create button
    const createBtn = page.getByRole("button", {
      name: /create|erstellen/i,
    }).first();
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();

    // The NewEmbedModal should appear with a title
    // i18n: newEmbedModal.title
    const modalHeading = page.getByRole("heading", { level: 3 }).first();
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    // The modal should have a workspace selection dropdown
    // i18n: newEmbedModal.workspace
    const workspaceSelect = page.locator('select[name="workspace_id"]');
    await expect(workspaceSelect).toBeVisible({ timeout: 10000 });

    // The modal should have a submit button
    // i18n: newEmbedModal.createEmbed
    const submitBtn = page.getByRole("button", {
      name: /create embed|embed erstellen|create/i,
    }).last();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    // Close the modal without submitting (we don't want to create
    // a real embed widget on every test run)
    // i18n: newEmbedModal.cancel
    const cancelBtn = page.getByRole("button", {
      name: /cancel|abbrechen/i,
    }).first();
    await cancelBtn.click();
    await page.waitForTimeout(1000);

    // No crash after closing modal
    await assertAppLoaded(page);
  });

  test("copy embed code snippet (if embeds exist)", async ({ page, request }) => {
    await page.goto("/settings/embed-chat-widgets", {
      waitUntil: "networkidle",
    });
    await assertAppLoaded(page);

    // Wait for the embed configs table to load
    await page.waitForTimeout(3000);

    // Look for the "Code" button in an embed row
    // i18n: embedConfigs.embedRow.code
    const codeBtn = page.getByRole("button", {
      name: /code|code/i,
    });

    if (await codeBtn.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      await codeBtn.first().click();

      // The CodeSnippetModal should appear
      // i18n: codeSnippetModal.title
      const snippetModal = page.getByRole("heading", { level: 3 }).first();
      await expect(snippetModal).toBeVisible({ timeout: 10000 });

      // The modal should show the script tag snippet
      // i18n: codeSnippetModal.scriptTagLabel
      await expect(
        page.getByText(/script tag|script-tag/i, { exact: false }).first(),
      ).toBeVisible({ timeout: 5000 });

      // Close the modal
      // i18n: codeSnippetModal.close
      const closeBtn = page.getByRole("button", {
        name: /close|schlie[^e]+en/i,
      }).first();
      await closeBtn.click();
      await page.waitForTimeout(1000);

      await assertAppLoaded(page);
    } else {
      test.skip(
        true,
        "No embed widgets exist — skipping code snippet copy test",
      );
    }
  });
});
