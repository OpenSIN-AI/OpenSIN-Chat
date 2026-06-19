// SPDX-License-Identifier: MIT
// Purpose: E2E test for settings page navigation — verifies each settings
// tab loads without crashing (no React error boundary).
// Docs: frontend/tests/e2e/README.doc.md
//
// Flow: login → seed session → navigate to each settings URL → verify the
// page mounts (no "Unexpected Application Error!" heading). Each tab is
// checked independently so a single broken page doesn't mask the rest.
import { test, expect } from "@playwright/test";
import {
  seedSession,
  mockOnboardingCheck,
  assertAppLoaded,
} from "./_helpers.js";
import { sharedLogin as login } from "./_token-cache.js";

const SETTINGS_TABS = [
  ["LLM Preference", "/settings/llm-preference"],
  ["Embedding Preference", "/settings/embedding-preference"],
  ["Vector Database", "/settings/vector-database"],
  ["Security", "/settings/security"],
  ["Interface", "/settings/interface"],
  ["System Health", "/settings/system-health"],
  ["Audio Preference", "/settings/audio-preference"],
  ["Transcription Preference", "/settings/transcription-preference"],
  ["Text Splitter", "/settings/text-splitter-preference"],
  ["Chat", "/settings/chat"],
  ["Branding", "/settings/branding"],
];

test.describe("settings navigation", () => {
  test.describe.configure({ mode: "serial" });

  let token;

  test.beforeAll(async ({ request }) => {
    token = await login(request);
  });

  test.beforeEach(async ({ page }) => {
    await seedSession(page, token);
    await mockOnboardingCheck(page);
  });

  for (const [label, path] of SETTINGS_TABS) {
    test(`settings tab "${label}" loads without crash`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      await assertAppLoaded(page);

      // The settings sidebar renders an "Instance Settings" heading
      // (i18n: settings.title → "Instance Settings")
      const settingsHeading = page.getByText(/Instance Settings/i).first();
      await expect(settingsHeading).toBeVisible({ timeout: 10000 });

      // Verify no error boundary is rendered
      const errorBoundary = page.getByRole("heading", {
        level: 2,
        name: /Unexpected Application Error/i,
      });
      await expect(errorBoundary).toHaveCount(0);
    });
  }

  test("settings sidebar shows top-level groups", async ({ page }) => {
    await page.goto("/settings/llm-preference", { waitUntil: "networkidle" });
    await assertAppLoaded(page);

    for (const group of ["AI Providers", "Admin", "Customization", "Tools"]) {
      await expect(
        page.getByText(group, { exact: true }).first(),
      ).toBeVisible({ timeout: 10000 });
    }
  });
});
