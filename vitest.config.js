// SPDX-License-Identifier: MIT
// Purpose: Root Vitest configuration for the tests/ server endpoint suite.
// Docs: vitest.config.js
// Keeps the frontend vitest config (frontend/vitest.config.js) untouched.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    include: ["tests/*.test.js"],
    exclude: [
      "**/node_modules/**",
      "tests/e2e/**",
      "frontend/**",
    ],
    // Reuse the same process to avoid spinning up multiple servers; tests
    // use the createApp() singleton.
    forks: {
      singleFork: true,
    },
  },
});
