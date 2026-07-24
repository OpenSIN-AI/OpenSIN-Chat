// SPDX-License-Identifier: MIT
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { fileURLToPath, URL } from "url";

// Detect CI so we can tune the build for shared runners.
const isCI = process.env.CI === "true" || process.env.CI === "1";
const shouldAnalyze = process.env.ANALYZE === "true";

// Issue #421: Node.js core-module polyfills for browser bundles.
// Several dependencies (jspdf, react-pdf, pdfjs-dist, etc.) reference
// Node.js built-ins (`process`, `stream`, `zlib`, `util`) that Vite does
// not auto-polyfill. Without these aliases the browser bundle fails at
// runtime with "Module 'process' has been externalized for browser
// compatibility" warnings and ReferenceErrors.
const nodePolyfills = {
  // `process` — required by many libs for env detection
  process: "process/browser",
  // `stream` — required by pdfjs-dist and jspdf
  stream: "stream-browserify",
  // `zlib` — required by pdfjs-dist for compressed streams
  zlib: "browserify-zlib",
  // `util` — required by various libs for inspect/format
  util: "util/",
};

export default defineConfig({
  plugins: [
    react(),
    shouldAnalyze &&
      visualizer({
        filename: "dist/stats.html",
        template: "treemap",
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
      // ── Node polyfill aliases (Issue #421) ──────────────────────────
      ...Object.entries(nodePolyfills).map(([find, replacement]) => ({
        find,
        replacement,
      })),
    ],
  },
  // Expose `process.env.*` to the browser bundle (many libs read
  // process.env.NODE_ENV at runtime).
  define: {
    "process.env": {},
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    // Use the modern esbuild target for smaller, faster output.
    target: "es2020",
    // Increase the chunk size warning limit — the PDF and chart vendors
    // are intentionally large and split into separate chunks.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Use consistent file names for better caching.
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        // Manual chunks for better caching of vendor code.
        // Rolldown (Vite 8) only accepts the function form of manualChunks —
        // the object form throws "TypeError: manualChunks is not a function".
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|react-router)\//.test(id))
            return "react-vendor";
          if (/node_modules\/react-pdf\//.test(id)) return "pdf-vendor";
          if (/node_modules\/(echarts|echarts-for-react)\//.test(id))
            return "chart-vendor";
          if (
            /node_modules\/(react-markdown|markdown-it|remark-gfm)\//.test(id)
          )
            return "markdown-vendor";
          return undefined;
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2020",
    },
    // Pre-bundle the polyfill packages so they're available immediately.
    include: [
      "process",
      "stream-browserify",
      "browserify-zlib",
      "util",
    ],
  },
  server: {
    // Bind to loopback by default. Opt into LAN/tunnel exposure explicitly
    // with VITE_DEV_HOST=0.0.0.0 (or another trusted interface).
    host: process.env.VITE_DEV_HOST || "127.0.0.1",
    port: 3000,
    // Proxy API requests to the backend server during development.
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  // Suppress the "useInlinedDev" warnings for the polyfill packages.
  logLevel: isCI ? "warn" : "info",
});
