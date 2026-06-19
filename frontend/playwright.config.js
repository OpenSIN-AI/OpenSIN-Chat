// SPDX-License-Identifier: MIT
// Purpose: Minimal Playwright configuration for frontend E2E tests.
// Docs: frontend/playwright.config.doc.md
import { defineConfig, devices } from "@playwright/test";

/**
 * Minimal Playwright configuration for the OpenSIN-Chat frontend.
 *
 * Assumes the dev server (or a production build) is already running at
 * APP_URL (default: http://localhost:38471). The frontend `package.json`
 * declares `@playwright/test` as a devDependency, so the runner is available
 * in the frontend workspace.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.APP_URL || "http://localhost:38471",
    locale: "en-US",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
