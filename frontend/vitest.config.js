import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";

// Dedicated Vitest config for the frontend.
// Kept separate from vite.config.js so the dev/build pipeline (visualizer,
// wasm assets, SSR-friendly output names) stays untouched by the test runner.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    css: false,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["src/utils/**/*.{js,jsx}"],
    },
  },
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
  },
});
