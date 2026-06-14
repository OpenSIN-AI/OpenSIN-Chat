// SPDX-License-Identifier: MIT
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";

// Detect CI so we can tune pool/timeouts for slower shared runners.
// GitHub Actions sets CI=true automatically; local dev keeps defaults.
const isCI = process.env.CI === "true" || process.env.CI === "1";

// Dedicated Vitest config kept separate from vite.config.js so the dev/build
// pipeline (visualizer, wasm assets, SSR-friendly output names, manualChunks)
// stays untouched by the test runner.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    css: false,
    clearMocks: true,
    restoreMocks: true,
    // ── Performance tuning for issue #136 ─────────────────────────────────
    // Use the threads pool with file-level isolation so mocks do not leak
    // between test files. The main speed gains come from capping workers and
    // from splitting the suite across parallel CI jobs in
    // .github/workflows/tests.yml.
    pool: isCI ? "threads" : "threads",
    isolate: true,
    // Cap workers on shared CI runners to prevent memory pressure and timeouts.
    // Two workers keep the jsdom environment overhead low while still running
    // tests in parallel.
    maxWorkers: isCI ? 2 : undefined,
    minWorkers: isCI ? 1 : undefined,
    // Explicit timeouts prevent hung tests from killing the whole job.
    testTimeout: isCI ? 30000 : 10000,
    hookTimeout: isCI ? 30000 : 10000,
    teardownTimeout: isCI ? 10000 : 5000,
    // Surface slow tests in the report so future regressions are visible.
    slowTestThreshold: 5000,
    // Use the default reporter plus a CI-friendly summary. JUnit output is
    // useful for GitHub Actions annotations and downstream tooling.
    reporter: isCI ? ["default", "junit"] : "default",
    outputFile: isCI ? { junit: "./test-results/junit.xml" } : undefined,
    // Retry only at the file level and only once in CI for transient failures.
    retry: 0,
    // ── Coverage settings ──────────────────────────────────────────────────
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      // Scope coverage to testable areas only:
      // - utils/ (pure functions, easy to test)
      // - hooks/ (small, focused, high-value)
      // - components/ (UI components)
      // Excluded: large page components (require full app context), provider/wrappers
      include: [
        "src/utils/**",
        "src/hooks/**",
        "src/components/**/*.{jsx,tsx}",
      ],
      // Exclude non-testable files:
      // - *.test.* (test files themselves)
      // - index.{js,ts} re-exports
      // - storybook stories
      exclude: [
        "**/*.test.{js,jsx,ts,tsx}",
        "**/*.spec.{js,jsx,ts,tsx}",
        "**/index.{js,ts}",
        "**/*.stories.{js,jsx,ts,tsx}",
        "**/node_modules/**",
      ],
      // Thresholds — see docs/COVERAGE-THRESHOLDS.md for context
      // Baseline (2026-06-08): 4.78% lines, 5.65% functions
      // Current coverage (2026-06-13): ~31.3% lines, ~38.4% branches,
      // ~30.7% functions, ~31.7% statements.
      // Issue #110 wants to raise thresholds toward industry-standard 40-70%.
      // Phase-2 target is 10% (already exceeded). Set thresholds to 20% to
      // prevent regression while remaining safely below current coverage.
      // These will be raised incrementally as more tests are added.
      thresholds: {
        lines: 20,
        branches: 20,
        functions: 20,
        statements: 20,
      },
      // Report uncovered files for visibility
      reportOnFailure: true,
    },
  },
});
