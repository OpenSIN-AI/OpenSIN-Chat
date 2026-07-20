// SPDX-License-Identifier: MIT
import {
  renameSync,
  existsSync,
  copyFileSync,
  readdirSync,
  statSync,
  createReadStream,
  createWriteStream,
} from "fs";
import { pipeline } from "stream/promises";
import { createGzip, createBrotliCompress, constants as zlibConstants } from "zlib";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`Running frontend post build script...`);
renameSync(
  path.resolve(__dirname, "../dist/index.html"),
  path.resolve(__dirname, "../dist/_index.html"),
);
console.log(
  `index.html renamed to _index.html so SSR of the index page can be assumed.`,
);

// Ensure ops playbooks that live in repo docs/ are always available for
// prerender (and the SPA ?raw content glob).
const contentDir = path.resolve(__dirname, "../src/pages/Docs/content");
const ensureFromDocs = [
  ["INCIDENT-RESPONSE.md", "incident-response.md"],
];
for (const [srcName, destName] of ensureFromDocs) {
  const src = path.resolve(__dirname, "../../docs", srcName);
  const dest = path.join(contentDir, destName);
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`[postbuild] synced docs/${srcName} → content/${destName}`);
  }
}

/**
 * Precompress hashed assets so origin can serve Content-Encoding: br|gzip
 * without CPU cost on request. Critical over Cloudflare Tunnel (origin→edge
 * bandwidth is the cold-path bottleneck, not Node CPU).
 */
async function precompressDistAssets() {
  const assetsDir = path.resolve(__dirname, "../dist/assets");
  if (!existsSync(assetsDir)) return;

  const COMPRESSIBLE = new Set([
    ".js",
    ".css",
    ".mjs",
    ".json",
    ".svg",
    ".html",
    ".txt",
    ".xml",
    ".map",
    ".wasm",
  ]);
  // Skip tiny files — compression middleware threshold is 1KB.
  const MIN_BYTES = 1024;

  /** @type {string[]} */
  const files = [];
  for (const name of readdirSync(assetsDir)) {
    const abs = path.join(assetsDir, name);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    if (name.endsWith(".br") || name.endsWith(".gz")) continue;
    const ext = path.extname(name).toLowerCase();
    if (!COMPRESSIBLE.has(ext)) continue;
    if (st.size < MIN_BYTES) continue;
    files.push(abs);
  }

  let done = 0;
  await Promise.all(
    files.map(async (abs) => {
      const gzPath = abs + ".gz";
      const brPath = abs + ".br";
      try {
        if (!existsSync(gzPath)) {
          await pipeline(
            createReadStream(abs),
            createGzip({ level: 9 }),
            createWriteStream(gzPath),
          );
        }
        if (!existsSync(brPath)) {
          await pipeline(
            createReadStream(abs),
            createBrotliCompress({
              params: {
                [zlibConstants.BROTLI_PARAM_QUALITY]: 5,
              },
            }),
            createWriteStream(brPath),
          );
        }
        done += 1;
      } catch (err) {
        console.warn(
          `[postbuild] precompress failed for ${path.basename(abs)}:`,
          err?.message || err,
        );
      }
    }),
  );
  console.log(
    `[postbuild] precompressed ${done}/${files.length} assets (.gz + .br)`,
  );
}

// Static prerender for the docs pages — improves LCP by serving HTML without
// waiting for the JS bundle to download, parse, and execute.
try {
  await import("./prerender-docs.mjs");
  console.log(`Docs prerender complete.`);
} catch (err) {
  console.error(`Docs prerender failed:`, err);
  process.exit(1);
}

await precompressDistAssets();

