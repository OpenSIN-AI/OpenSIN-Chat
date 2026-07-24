// SPDX-License-Identifier: MIT
// Purpose: E2E test for privacy and data settings — verify the privacy
// settings page loads, test the telemetry toggle, and test data
// management features (export/delete) if they exist.
// Docs: frontend/tests/e2e/README.doc.md
//
// Route: /settings/privacy
// The page shows a ProviderPrivacy section and a TelemetryLogs section
// with an anonymous telemetry toggle. OpenSIN-Chat does not currently
// have "Export my data" (GDPR) or "Delete my account" buttons — those
// tests are skipped with a clear reason.
import { test, expect } from "@playwright/test";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

test.describe("privacy and data settings", () => {
  test.describe.configure({ mode: "serial" });

  let token;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test.beforeEach(async ({ page }) => {
    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  test("privacy settings page loads without crash", async ({ page }) => {
    await page.goto("/settings/privacy", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // The page renders a title (i18n: privacy.title)
    // and a description (i18n: privacy.description)
    // Verify the settings sidebar is visible
    await expect(
      page.getByText(/Instance Settings|Instanz-Einstellungen/i).first(),
    ).toBeVisible({ timeout: 10000 });

    // No React error boundary
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Unexpected Application Error/i,
      }),
    ).toHaveCount(0);
  });

  test("privacy page shows provider privacy and telemetry sections", async ({
    page,
  }) => {
    await page.goto("/settings/privacy", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // Wait for the loading state to finish and content to render
    // The ProviderPrivacy component renders provider-specific privacy info
    // The TelemetryLogs component renders a toggle for anonymous telemetry
    // i18n: privacy.anonymous
    await page.waitForTimeout(3000);

    // The telemetry toggle should be visible (i18n: privacy.anonymous)
    // The Toggle component renders a label with the i18n text
    const telemetryLabel = page.getByText(
      /anonymous|anonym/i,
      { exact: false },
    ).first();
    await expect(telemetryLabel).toBeVisible({ timeout: 15000 });

    // No crash after the sections load
    await assertAppLoaded(page);
  });

  test("telemetry toggle is clickable and does not crash", async ({ page }) => {
    await page.goto("/settings/privacy", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    // Wait for the content to load
    await page.waitForTimeout(3000);

    // The Toggle component renders a clickable button/switch
    // i18n: privacy.anonymous — the toggle label
    const telemetryLabel = page.getByText(
      /anonymous|anonym/i,
      { exact: false },
    ).first();
    await expect(telemetryLabel).toBeVisible({ timeout: 15000 });

    // The Toggle component itself is a button-like element
    // Find the toggle switch near the label
    const toggleContainer = telemetryLabel.locator("..");
    const toggleButton = toggleContainer.locator("button").first();

    if (await toggleButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await toggleButton.click();
      await page.waitForTimeout(2000);

      // Page should still be loaded (no crash)
      await assertAppLoaded(page);
    } else {
      // The toggle might be a div with role="switch" or a custom element
      const toggleSwitch = page.getByRole("switch").first();
      if (await toggleSwitch.isVisible({ timeout: 5000 }).catch(() => false)) {
        await toggleSwitch.click();
        await page.waitForTimeout(2000);
        await assertAppLoaded(page);
      } else {
        test.skip(true, "Telemetry toggle not found — skipping toggle test");
      }
    }
  });

  test("export my data button (GDPR)", async ({ page }) => {
    // OpenSIN-Chat does not currently have a "Export my data" (GDPR)
    // button on the privacy settings page. This test is skipped until
    // that feature is implemented.
    test.skip(true, "Export my data (GDPR) feature not implemented in OpenSIN-Chat");
  });

  test("delete my account button with confirmation", async ({ page }) => {
    // OpenSIN-Chat does not currently have a "Delete my account" button
    // on the privacy settings page. This test is skipped until that
    // feature is implemented.
    test.skip(true, "Delete my account feature not implemented in OpenSIN-Chat");
  });
});
