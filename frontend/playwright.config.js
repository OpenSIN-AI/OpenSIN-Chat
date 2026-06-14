// SPDX-License-Identifier: MIT
// Purpose: Minimal Playwright configuration for frontend E2E tests.
// Docs: frontend/tests/e2e/README.doc.md
import { defineConfig, devices } from "@playwright/test";

/**
 * Minimal Playwright configuration for the OpenSIN-Chat frontend.
 *
 * Assumes the dev server (or a production build) is already running at
 * APP_URL (default: http://localhost:3001). The root `package.json` already
 * declares `playwright` as a dependency, so no additional installation is
 * required.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: process.env.APP_URL || "http://localhost:3001",
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
