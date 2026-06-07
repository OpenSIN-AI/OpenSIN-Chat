// SPDX-License-Identifier: MIT
/**
 * SPDX header tool — adds or verifies `SPDX-License-Identifier: MIT` headers
 * across all first-party source files.
 *
 * Docs: spdx-headers.doc.md
 *
 * Usage:
 *   node scripts/spdx-headers.js          # add missing headers (write mode)
 *   node scripts/spdx-headers.js --check   # CI mode: exit 1 if any file lacks header
 *
 * Behavior:
 *   - Targets .js/.jsx/.ts/.tsx/.mjs/.cjs files
 *   - Skips node_modules, dist, build, .git, coverage, vendor caches
 *   - Preserves shebang (`#!`) lines — header is inserted after the shebang
 *   - Idempotent: never double-adds a header
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HEADER = "// SPDX-License-Identifier: MIT";
const EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  "vector-cache",
  "storage",
  "out",
]);
// Generated/third-party files we should not touch.
const IGNORE_FILE_PATTERNS = [/\.min\.js$/, /next-env\.d\.ts$/, /\.d\.ts$/];

function shouldIgnoreFile(filePath) {
  return IGNORE_FILE_PATTERNS.some((re) => re.test(filePath));
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      const full = path.join(dir, entry.name);
      if (EXTENSIONS.has(ext) && !shouldIgnoreFile(full)) files.push(full);
    }
  }
  return files;
}

function hasHeader(content) {
  // Allow the header to appear within the first ~3 lines (after a shebang).
  const head = content.split("\n", 3).join("\n");
  return head.includes("SPDX-License-Identifier");
}

function addHeader(content) {
  if (content.startsWith("#!")) {
    const nl = content.indexOf("\n");
    if (nl === -1) return `${content}\n${HEADER}\n`;
    return `${content.slice(0, nl + 1)}${HEADER}\n${content.slice(nl + 1)}`;
  }
  return `${HEADER}\n${content}`;
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const files = walk(ROOT);
  const missing = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    if (hasHeader(content)) continue;
    missing.push(path.relative(ROOT, file));
    if (!checkOnly) fs.writeFileSync(file, addHeader(content), "utf8");
  }

  if (checkOnly) {
    if (missing.length > 0) {
      console.error(
        `[spdx] ${missing.length} file(s) missing SPDX-License-Identifier header:`
      );
      missing.slice(0, 50).forEach((f) => console.error(`  - ${f}`));
      if (missing.length > 50)
        console.error(`  ... and ${missing.length - 50} more`);
      process.exit(1);
    }
    console.log(`[spdx] OK — all ${files.length} source files have headers.`);
    return;
  }

  console.log(
    `[spdx] Added headers to ${missing.length} file(s) (${files.length} scanned).`
  );
}

main();
