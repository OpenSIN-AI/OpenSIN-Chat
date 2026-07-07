// SPDX-License-Identifier: MIT
import { defineConfig } from "vite"
import { fileURLToPath, URL } from "url"
import postcss from "./postcss.config.js"
import react from "@vitejs/plugin-react"
import dns from "dns"
import { visualizer } from "rollup-plugin-visualizer"
import { ViteImageOptimizer } from "vite-plugin-image-optimizer"

dns.setDefaultResultOrder("verbatim")

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: [
    './public/piper/ort-wasm-simd-threaded.wasm',
    './public/piper/piper_phonemize.wasm',
    './public/piper/piper_phonemize.data',
  ],
  worker: {
    format: 'es'
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: ["localhost", "127.0.0.1"],
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },

  // Only replace the specific process.env values the browser actually needs.
  // Vite exposes VITE_* variables via import.meta.env; this whitelist exists
  // for libraries that still check process.env.NODE_ENV. Never expose the
  // full process.env object here.
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production")
  },

  css: {
    postcss
  },
  plugins: [
    react(),
    ViteImageOptimizer({
      png: { quality: 85 },
      jpeg: { quality: 85 },
      webp: { quality: 85 },
    }),
    visualizer({
      template: "treemap", // or sunburst
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: "bundleinspector.html", // will be saved in project's root
      emitFile: process.env.NODE_ENV === "development", // only emit in dev builds
    }),
    // Vite 8/Rolldown no longer supports function aliases in resolve.alias.
    // Strip the webpack-style `~` prefix from imports so node_modules packages
    // resolve correctly (e.g. `~@phosphor-icons/react` -> `@phosphor-icons/react`).
    {
      name: "strip-tilde-alias",
      enforce: "pre",
      resolveId(id) {
        if (id.startsWith("~")) {
          return id.slice(1)
        }
      }
    }
  ],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url))
      },
      { find: "process", replacement: "process/browser" },
      { find: "stream", replacement: "stream-browserify" },
      { find: "zlib", replacement: "browserify-zlib" },
      { find: "util", replacement: "util" },
    ]
  },
  build: {
    // Top-level await in main.tsx (DEV-only MSW import) requires esnext target.
    target: "esnext",
    // The SSR setup pins entryFileNames to 'index.js', so the application entry
    // chunk cannot be code-split and is legitimately large. Vendor libraries are
    // split into cacheable chunks via manualChunks below; the limit is raised to
    // reflect the known, intentional size of the single SSR entry bundle.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // These settings ensure the primary JS and CSS file references are always index.{js,css}
        // so we can SSR the index.html as text response from server/index.js without breaking references each build.
        entryFileNames: 'index.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'index.css') return `index.css`;
          return assetInfo.name;
        },
        // Split heavy third-party libraries into their own cacheable chunks so the
        // primary index.js stays lean and the build no longer emits >500kb warnings.
        // The SSR template only references index.js/index.css; these vendor chunks
        // are loaded through the module graph at runtime.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // KEEP react in the main entry chunk — splitting it causes a race
          // condition where UI chunks try to call React.useLayoutEffect before
          // React has finished initializing. The catch-all vendor chunk below
          // therefore contains React and closely coupled React libraries.
          if (/[\\/]node_modules[\\/](katex)[\\/]/.test(id)) return "vendor-katex";
          if (/[\\/]node_modules[\\/](highlight\.js)[\\/]/.test(id)) return "vendor-highlight";
          // React-markdown and the full remark/rehype/mdast/micromark ecosystem
          // are only needed when rendering markdown messages.
          if (/[\\/]node_modules[\\/](react-markdown|markdown-it|dompurify|@mintplex-labs[\\/]mdpdf|marked|remark[-/]|rehype[-/]|mdast[-/]|micromark[-/]|unist[-/]|hast[-/]|property-information|entities|space-separated-tokens|comma-separated-tokens|vfile)[\\/]/.test(id))
            return "vendor-markdown";
          if (/[\\/]node_modules[\\/](@phosphor-icons|react-icons|lucide-react)[\\/]/.test(id))
            return undefined;
          // KEEP recharts / @tremor / d3 in the route chunks. The previous
          // vendor-charts split produced an ESM TDZ race because recharts reached
          // the React namespace before it had initialized. Leaving them inside the
          // lazy-loaded Chartable route chunk keeps the cross-chunk import out.
          if (/[\\/]node_modules[\\/](recharts|d3-|@tremor)[\\/]/.test(id))
            return undefined;
          if (/[\\/]node_modules[\\/](onnxruntime-web|@mintplex-labs[\\/]piper-tts-web|@opensin[\\/]piper-tts-web)[\\/]/.test(id))
            return "vendor-tts";
          if (/[\\/]node_modules[\\/](lodash|moment|date-fns|dayjs)[\\/]/.test(id))
            return "vendor-utils";
          // Heavy PDF / document generation libraries used only in specific routes
          // (e.g. scheduled jobs file export, PDF analysis). Splitting them out of
          // the catch-all vendor chunk is the main driver for keeping vendor.js
          // below the 2000 KB warning limit.
          if (/[\\/]node_modules[\\/](docx|jspdf|html2canvas|canvg|pako)[\\/]/.test(id))
            return "vendor-pdf";
          // Cron expression parsing is only used by the scheduled-jobs UI.
          if (/[\\/]node_modules[\\/](cronstrue)[\\/]/.test(id))
            return "vendor-cron";
          // Speech recognition is only used when the browser STT feature is enabled.
          if (/[\\/]node_modules[\\/](react-speech-recognition)[\\/]/.test(id))
            return "vendor-speech";
          // QR code generation is only used on the mobile connections page.
          if (/[\\/]node_modules[\\/](qrcode\.react)[\\/]/.test(id))
            return "vendor-qrcode";
          // vendor-ui chunks MUST come after React in the main bundle, so keep
          // them in the main chunk as well to avoid the race.
          if (/[\\/]node_modules[\\/](react-tooltip|@tanstack|@floating-ui)[\\/]/.test(id))
            return undefined;
          // Split heavy i18n, state, and UI libraries out of the catch-all vendor chunk.
          if (/[\\/]node_modules[\\/](i18next|react-i18next|i18next-)[\\/]/.test(id))
            return "vendor-i18n";
          if (/[\\/]node_modules[\\/](swr|zustand|recoil|@tanstack)[\\/]/.test(id))
            return "vendor-state";
          if (/[\\/]node_modules[\\/](react-toastify|react-error-boundary|react-loading-skeleton|react-tooltip)[\\/]/.test(id))
            return "vendor-ui";
          if (/[\\/]node_modules[\\/](he|html-entities|validator|joi|@hapi)[\\/]/.test(id))
            return "vendor-utils2";
          if (/[\\/]node_modules[\\/](react-router|react-router-dom|@remix-run|history)[\\/]/.test(id))
            return "vendor-router";
          // ECharts chart rendering (used only in Chartable message component).
          if (/[\\/]node_modules[\\/](echarts|zrender)[\\/]/.test(id))
            return "vendor-charts";
          // @lobehub provider brand icons.
          if (/[\\/]node_modules[\\/](@lobehub)[\\/]/.test(id))
            return "vendor-icons";
          // Lucide icon set (tree-shaken but still sizable).
          if (/[\\/]node_modules[\\/](lucide-react)[\\/]/.test(id))
            return "vendor-lucide";
          // React Aria / Adobe accessibility primitives.
          if (/[\\/]node_modules[\\/](react-aria|react-stately|@internationalized)[\\/]/.test(id))
            return "vendor-aria";
          // Polyfills and babel runtime (heavy, loaded once).
          if (/[\\/]node_modules[\\/](core-js|@babel[\\/]runtime|regenerator-runtime)[\\/]/.test(id))
            return "vendor-polyfill";
          return "vendor";
        },
      },
      external: [
        // Reduces transformation time by 50% and we don't even use this variant, so we can ignore.
        /@phosphor-icons\/react\/dist\/ssr/,
      ]
    },
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    include: ["@mintplex-labs/piper-tts-web"],
    rolldownOptions: {
      define: {
        global: "globalThis"
      }
    }
  }
})
