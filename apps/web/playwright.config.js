// SPDX-License-Identifier: MIT
// Purpose: Playwright configuration for web application E2E tests.
// Docs: docs/architecture.md
import { defineConfig, devices } from "@playwright/test";

/**
 * Assumes the web application and API are already running at APP_URL
 * (default: http://localhost:38471). The stateless smoke spec is suitable for
 * fresh CI databases; the full suite requires an initialized test instance.
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
