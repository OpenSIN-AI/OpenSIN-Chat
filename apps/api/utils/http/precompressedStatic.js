// SPDX-License-Identifier: MIT
// Purpose: Serve prebuilt .br/.gz companions for static assets (tunnel bandwidth).
// Docs: When frontend/postbuild writes file.js.br / file.js.gz next to hashed
// assets, this middleware picks the best encoding the client accepts and skips
// on-the-fly compression for multi-MB JS/CSS (critical over Cloudflare Tunnel).

const fs = require("fs");
const path = require("path");

const ENCODABLE_EXT = new Set([
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

/**
 * @param {string} rootDir absolute path to public/
 * @returns {import("express").RequestHandler}
 */
function precompressedStatic(rootDir) {
  return function servePrecompressed(req, res, next) {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    // Only handle asset paths (and a few root static files). Leave API alone.
    const urlPath = (req.path || "").split("?")[0];
    if (!urlPath || urlPath.includes("..")) return next();

    const rootAbs = path.resolve(rootDir);
    const abs = path.resolve(rootDir, "." + urlPath);
    // Require path.sep after the root to avoid prefix attacks
    // (e.g. root=/app/public vs abs=/app/public-evil/...).
    if (abs !== rootAbs && !abs.startsWith(rootAbs + path.sep)) return next();

    const ext = path.extname(abs).toLowerCase();
    if (!ENCODABLE_EXT.has(ext)) return next();

    const accept = String(req.headers["accept-encoding"] || "");
    /** @type {{ enc: string, file: string } | null} */
    let pick = null;
    if (/\bbr\b/.test(accept) && fs.existsSync(abs + ".br")) {
      pick = { enc: "br", file: abs + ".br" };
    } else if (/\bgzip\b/.test(accept) && fs.existsSync(abs + ".gz")) {
      pick = { enc: "gzip", file: abs + ".gz" };
    }
    if (!pick) return next();

    // Cache headers mirror app.js static policy for hashed assets.
    const base = path.basename(abs);
    const isHtml = ext === ".html";
    const isRootEntry =
      base === "index.js" || base === "index.css" || base === "manifest.json";
    if (isHtml || isRootEntry) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    } else if (urlPath.includes("/assets/")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }

    res.setHeader("Content-Encoding", pick.enc);
    res.setHeader("Vary", "Accept-Encoding");
    res.type(ext === ".mjs" ? "application/javascript" : ext);
    // Content-Length of the compressed body
    try {
      const st = fs.statSync(pick.file);
      res.setHeader("Content-Length", st.size);
    } catch {
      /* stream without length */
    }
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(pick.file).pipe(res);
  };
}

module.exports = { precompressedStatic };
