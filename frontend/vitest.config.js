// SPDX-License-Identifier: MIT
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";

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
      // Issue #85 (vitest coverage) wants 40%, but that's a multi-week effort.
      // Set progressive thresholds that are realistic to maintain:
      // - Each test run enforces minimums to prevent regression
      // - Realistic targets based on what existing test files cover
      thresholds: {
        // Lines: enforced at low bar initially, will rise as tests are added
        lines: 2,
        // Functions: SWR hooks have high coverage → higher threshold
        functions: 4,
        // Branches: harder to cover → lowest
        branches: 2,
        // Statements: matches lines
        statements: 2,
      },
      // Auto-update thresholds to current coverage if higher (only when not in CI)
      // This way, adding tests automatically raises the bar
      autoUpdate: process.env.CI !== "true",
      // Report uncovered files for visibility
      reportOnFailure: true,
    },
  },
});
