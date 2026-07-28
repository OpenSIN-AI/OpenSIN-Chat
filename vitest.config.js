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
      // Removed product areas: these legacy endpoint contracts no longer exist.
      "tests/communityHub*.test.js",
      "tests/mobileEndpoints.test.js",
      // Focused Jest suites under apps/api/__tests__ own these unit contracts.
      "tests/mcpIntegration.test.js",
      "tests/speechTtsPushNotifications.test.js",
      "tests/vectorStoreDocumentManager.test.js",
    ],
    env: {
      INTEGRATION_TEST: "true",
    },
    // The first endpoint in a file boots the full API dependency graph. On
    // Node 24 (especially arm64 CI/dev hosts) that cold start can exceed the
    // Vitest defaults even though the endpoint itself succeeds.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Reuse the same process to avoid spinning up multiple servers; tests
    // use the createApp() singleton.
    fileParallelism: false,
    pool: "forks",
    singleFork: true,
  },
});
