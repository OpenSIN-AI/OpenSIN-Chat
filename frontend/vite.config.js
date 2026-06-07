// SPDX-License-Identifier: MIT
import { defineConfig } from "vite"
import { fileURLToPath, URL } from "url"
import postcss from "./postcss.config.js"
import react from "@vitejs/plugin-react"
import dns from "dns"
import { visualizer } from "rollup-plugin-visualizer"

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
    allowedHosts: ["sb-19llfl8xfbze.vercel.run", "localhost", "127.0.0.1"]
  },
  define: {
    "process.env": process.env
  },
  css: {
    postcss
  },
  plugins: [
    react(),
    visualizer({
      template: "treemap", // or sunburst
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: "bundleinspector.html" // will be saved in project's root
    })
  ],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url))
      },
      {
        process: "process/browser",
        stream: "stream-browserify",
        zlib: "browserify-zlib",
        util: "util",
        find: /^~.+/,
        replacement: (val) => {
          return val.replace(/^~/, "")
        }
      }
    ]
  },
  build: {
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
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
            return "vendor-react";
          if (/[\\/]node_modules[\\/]katex[\\/]/.test(id)) return "vendor-katex";
          if (/[\\/]node_modules[\\/]highlight\.js[\\/]/.test(id)) return "vendor-highlight";
          if (/[\\/]node_modules[\\/](markdown-it|dompurify|@mintplex-labs[\\/]mdpdf|marked|remark|rehype|mdast|micromark)[\\/]/.test(id))
            return "vendor-markdown";
          if (/[\\/]node_modules[\\/](@phosphor-icons|react-icons|lucide-react)[\\/]/.test(id))
            return "vendor-icons";
          if (/[\\/]node_modules[\\/](recharts|d3-|@tremor)[\\/]/.test(id))
            return "vendor-charts";
          if (/[\\/]node_modules[\\/](onnxruntime-web|@mintplex-labs[\\/]piper-tts-web|@openafd[\\/]piper-tts-web)[\\/]/.test(id))
            return "vendor-tts";
          if (/[\\/]node_modules[\\/](lodash|moment|date-fns|dayjs)[\\/]/.test(id))
            return "vendor-utils";
          if (/[\\/]node_modules[\\/](react-tooltip|@tanstack|@floating-ui)[\\/]/.test(id))
            return "vendor-ui";
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
    include: ["@openafd/piper-tts-web"],
    esbuildOptions: {
      define: {
        global: "globalThis"
      },
      plugins: []
    }
  }
})
