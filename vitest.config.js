// SPDX-License-Identifier: MIT
// Purpose: Root Vitest configuration for the tests/ server endpoint suite.
// Docs: vitest.config.js
// Keeps the frontend vitest config (frontend/vitest.config.js) untouched.

import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^\.\.\/server/,
        replacement: fileURLToPath(new URL("./apps/api", import.meta.url)),
      },
      {
        find: /^\.\.\/collector/,
        replacement: fileURLToPath(new URL("./apps/worker", import.meta.url)),
      },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    include: ["tests/*.test.js"],
    exclude: [
      "**/node_modules/**",
      "tests/e2e/**",
      "apps/web/**",
    ],
    env: {
      INTEGRATION_TEST: "true",
    },
    // Reuse the same process to avoid spinning up multiple servers; tests
    // use the createApp() singleton.
    fileParallelism: false,
    pool: "forks",
    singleFork: true,
  },
});
